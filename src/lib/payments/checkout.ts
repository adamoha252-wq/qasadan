import "server-only";

/**
 * Server-side client-checkout logic (Phase 3, spec §4).
 *
 * Security / correctness model:
 *  - The 192-bit invoice token in the URL IS the authorization (same as the
 *    public /pay page). No session needed.
 *  - ZERO frontend trust: the POST endpoint re-validates EVERYTHING
 *    server-side (invoice state, provider activation, enabled method,
 *    currency compatibility, payer phone format).
 *  - Anti-double-pay: an invoice can only have ONE in-flight hosted-checkout
 *    attempt. Re-submitting returns the SAME provider checkout URL
 *    (idempotent) instead of creating a second transaction.
 *  - Optimistic status claim: the invoice flips PENDING → PROCESSING only if
 *    it was still PENDING at that instant (conditional updateMany), which
 *    serializes concurrent "Pay" clicks. If the provider rejects the request,
 *    the invoice self-heals back to PENDING and the failed attempt is kept
 *    as an audit record.
 *  - Provider callbacks (success/failure) are recorded but UNTRUSTED — the
 *    PAID transition only ever happens after server-side verification
 *    (HPP_GETTRANINFO / signed webhooks, Phase 4).
 */

import crypto from "node:crypto";
import { db } from "@/lib/db";
import { loadCredentials, parseJsonArray } from "./credentials";
import { getProviderDefinition } from "./registry";
import { isInvoiceOverdue } from "./invoice-types";
import {
  isValidPayerPhone,
  methodRequiresPayerAccount,
  normalizePayerPhone,
  type CheckoutBlockedReason,
  type CheckoutOptions,
  type CheckoutProvider,
} from "./checkout-types";
import { createWaafiHostedPurchase } from "./waafipay";

/* ------------------------- attempt lifecycle ------------------------- */

export const PAYMENT_ATTEMPT_STATUSES = [
  "INITIATING", // row created, provider call in flight
  "INITIATED", // provider issued the hosted checkout URL
  "CALLBACK_SUCCESS", // success callback received (untrusted until verified)
  "CALLBACK_FAILURE", // failure/abort callback received — retry allowed
  "SUCCEEDED", // verified paid (Phase 4)
  "FAILED", // provider rejected the initiation or verification failed
] as const;

/** Attempts considered "in flight" — block a second transaction. */
const ACTIVE_STATUSES = ["INITIATING", "INITIATED", "CALLBACK_SUCCESS"];
/** An INITIATING row older than this without an outcome is treated as dead. */
const STALE_INITIATING_MS = 3 * 60 * 1000;
/** An issued checkout URL older than this is considered abandoned. */
const ATTEMPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Public checkout options for the /pay page (privacy-safe, catalog only). */
export async function getCheckoutOptions(token: string): Promise<CheckoutOptions | null> {
  // Inline await + sanitized return value (RSC flight-stream safety, see
  // findInvoiceClientViewByToken in invoices.ts for the rationale).
  const row = await db.invoice.findUnique({ where: { token } });
  if (!row) return null;

  const overdue = isInvoiceOverdue(row.status, row.dueDate);

  if (row.status === "PROCESSING") {
    const active = await findActiveAttempt(row.id);
    return {
      payable: false,
      reason: "PAYMENT_PROCESSING",
      providers: [],
      resumeUrl: active?.hppUrl ?? null,
    };
  }

  if (row.status === "PAID") {
    return { payable: false, reason: "ALREADY_PAID", providers: [], resumeUrl: null };
  }
  if (row.status === "CANCELLED" || row.status === "EXPIRED") {
    return { payable: false, reason: row.status === "CANCELLED" ? "CANCELLED" : "EXPIRED", providers: [], resumeUrl: null };
  }
  if (overdue) {
    return { payable: false, reason: "OVERDUE", providers: [], resumeUrl: null };
  }

  const providers = await listPublicProvidersForCurrency(row.currency);
  return {
    payable: providers.length > 0,
    reason: providers.length > 0 ? null : "NO_PROVIDERS",
    providers,
    resumeUrl: null,
  };
}

/**
 * Active (in-flight) attempt of an invoice, or null.
 * Rows that are too old are treated as abandoned (never block a retry
 * forever) — but they are NOT mutated here; re-initiation heals them.
 */
async function findActiveAttempt(invoiceId: string) {
  const rows = await db.payment.findMany({
    where: { invoiceId, status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const now = Date.now();
  for (const row of rows) {
    const age = now - row.createdAt.getTime();
    if (row.status === "INITIATING") {
      if (age <= STALE_INITIATING_MS) return row;
      continue; // dead in-flight initiation — keep looking
    }
    // INITIATED / CALLBACK_SUCCESS: needs a checkout URL and freshness
    if (row.hppUrl && age <= ATTEMPT_MAX_AGE_MS) return row;
  }
  return null;
}

/**
 * Public provider catalog for a currency: only ADMIN-ACTIVATED, implemented
 * providers with complete credentials, enabled methods and a matching
 * currency. This is what makes the payment methods publicly visible (spec
 * §4 + user requirement: "the payment method should be visible to the
 * public as we want them to select it").
 */
export async function listPublicProvidersForCurrency(
  currency: string
): Promise<CheckoutProvider[]> {
  const rows = await db.paymentProvider.findMany({ where: { isActive: true } });
  const result: CheckoutProvider[] = [];
  for (const row of rows) {
    const def = getProviderDefinition(row.code);
    if (!def || !def.implemented) continue;

    const { values } = loadCredentials(row);
    const complete = def.requiredFields.every((k) => values[k]?.trim());
    if (!complete) continue;

    const enabledCurrencies = parseJsonArray(row.currencies).map((c) => c.toUpperCase());
    if (!enabledCurrencies.includes(currency.toUpperCase())) continue;

    const enabledMethods = new Set(parseJsonArray(row.methods));
    const methods = def.methods
      .filter((m) => enabledMethods.has(m.code))
      .map((m) => ({
        code: m.code,
        label: m.label,
        ...(m.description ? { description: m.description } : {}),
        requiresPayerAccount: methodRequiresPayerAccount(m.code),
      }));
    if (methods.length === 0) continue;

    result.push({
      code: def.code,
      name: def.name,
      tagline: def.tagline,
      icon: def.icon,
      methods,
    });
  }
  return result;
}

/* --------------------------- rate limiting --------------------------- */
// Separate lightweight limiter for the public initiation endpoint (per
// invoice token). In-memory like the login limiter — documented for the
// multi-server production deployment (see DEPLOYMENT.md §9).
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const rateBuckets = new Map<string, { count: number; firstAt: number }>();

function checkInitiationRate(token: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateBuckets.get(token);
  if (!entry || now - entry.firstAt > RATE_WINDOW_MS) {
    rateBuckets.set(token, { count: 1, firstAt: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.firstAt + RATE_WINDOW_MS - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/* --------------------------- initiation --------------------------- */

export type InitiateInput = {
  token: string;
  providerCode: string;
  paymentMethod: string;
  /** Raw customer input — normalized here. */
  payerPhone?: string;
  /** Absolute HTTPS origin used to build the provider callback URLs. */
  origin: string;
};

export type InitiateOutcome =
  | { kind: "REDIRECT"; redirectUrl: string; resumed: boolean }
  | { kind: "ERROR"; status: number; error: string; retryAfterSec?: number };

/** Unique merchant reference: QSD-<invoiceNumber>-<8 hex> (docs: 1–50 chars, [A-Za-z0-9-_.]). */
function buildReferenceId(invoiceNumber: string): string {
  return `QSD-${invoiceNumber}-${crypto.randomBytes(4).toString("hex")}`;
}

export async function initiatePayment(input: InitiateInput): Promise<InitiateOutcome> {
  const invoice = await db.invoice.findUnique({ where: { token: input.token } });
  if (!invoice) {
    return { kind: "ERROR", status: 404, error: "Payment link not found." };
  }

  // ---- Invoice state machine (server-side, zero frontend trust) ----
  if (invoice.status === "PAID") {
    return { kind: "ERROR", status: 409, error: "This invoice has already been paid. Thank you!" };
  }
  if (invoice.status === "CANCELLED" || invoice.status === "EXPIRED") {
    return { kind: "ERROR", status: 409, error: "This payment link is no longer active. Please contact QASADAN." };
  }
  if (isInvoiceOverdue(invoice.status, invoice.dueDate)) {
    return { kind: "ERROR", status: 409, error: "This invoice is past its due date — please contact QASADAN to arrange payment." };
  }

  // PROCESSING: resume the in-flight attempt instead of creating a second
  // transaction (anti-double-pay). A stale PROCESSING state without a live
  // attempt self-heals back to PENDING.
  if (invoice.status === "PROCESSING") {
    const active = await findActiveAttempt(invoice.id);
    if (active?.hppUrl) {
      return { kind: "REDIRECT", redirectUrl: active.hppUrl, resumed: true };
    }
    const healed = await db.invoice.updateMany({
      where: { id: invoice.id, status: "PROCESSING" },
      data: { status: "PENDING" },
    });
    if (healed.count === 0) {
      // A concurrent request changed the state underneath us — re-read.
      const fresh = await db.invoice.findUnique({ where: { id: invoice.id } });
      if (fresh?.status === "PENDING") {
        // fall through to normal initiation below
      } else {
        return { kind: "ERROR", status: 409, error: "A payment for this invoice is already being processed." };
      }
    }
  } else if (invoice.status !== "PENDING") {
    // FAILED / REFUNDED invoice-level states are not payable either
    return { kind: "ERROR", status: 409, error: "This invoice cannot be paid right now. Please contact QASADAN." };
  }

  // Any pre-existing in-flight attempt (e.g. invoice healed from stale
  // PROCESSING) still blocks a second transaction.
  const existing = await findActiveAttempt(invoice.id);
  if (existing?.hppUrl) {
    return { kind: "REDIRECT", redirectUrl: existing.hppUrl, resumed: true };
  }

  // ---- Provider validation (activation, method, currency, credentials) ----
  const provider = await db.paymentProvider.findUnique({ where: { code: input.providerCode } });
  const def = getProviderDefinition(input.providerCode);
  if (!provider || !def || !def.implemented) {
    return { kind: "ERROR", status: 400, error: "Unknown payment provider." };
  }
  if (!provider.isActive) {
    return { kind: "ERROR", status: 409, error: "This payment provider is currently unavailable. Please choose another." };
  }
  const methodDef = def.methods.find((m) => m.code === input.paymentMethod);
  const enabledMethods = new Set(parseJsonArray(provider.methods));
  if (!methodDef || !enabledMethods.has(input.paymentMethod)) {
    return { kind: "ERROR", status: 400, error: "This payment method is not available for the selected provider." };
  }
  const enabledCurrencies = parseJsonArray(provider.currencies).map((c) => c.toUpperCase());
  if (!enabledCurrencies.includes(invoice.currency.toUpperCase())) {
    return { kind: "ERROR", status: 409, error: "This provider cannot pay invoices in this currency." };
  }
  const { values: credentials } = loadCredentials(provider);
  const missing = def.requiredFields.filter((k) => !credentials[k]?.trim());
  if (missing.length > 0) {
    return { kind: "ERROR", status: 409, error: "The payment provider is not fully configured. Please try again later or contact QASADAN." };
  }

  // ---- Payer account (required for wallet methods per WAAFI docs) ----
  const phone = normalizePayerPhone(input.payerPhone ?? "");
  if (methodRequiresPayerAccount(input.paymentMethod)) {
    if (!phone) {
      return { kind: "ERROR", status: 400, error: "Enter the mobile number that will pay (e.g. 252611111111)." };
    }
    if (!isValidPayerPhone(phone)) {
      return { kind: "ERROR", status: 400, error: "Enter a valid mobile number in international format without + (e.g. 252611111111)." };
    }
  }

  // ---- Rate limit: only REAL initiation attempts count (validation
  // failures above are free — a customer with a typo in their phone number
  // must not lock themselves out). ----
  const rate = checkInitiationRate(input.token);
  if (!rate.allowed) {
    return {
      kind: "ERROR",
      status: 429,
      error: "Too many payment attempts. Please wait a few minutes and try again.",
      retryAfterSec: rate.retryAfterSec,
    };
  }

  // ---- Claim the invoice (serializes concurrent Pay clicks) ----
  const claimed = await db.invoice.updateMany({
    where: { id: invoice.id, status: "PENDING" },
    data: { status: "PROCESSING" },
  });
  if (claimed.count === 0) {
    // Someone else won the race — resume their attempt if there is one.
    const active = await findActiveAttempt(invoice.id);
    if (active?.hppUrl) return { kind: "REDIRECT", redirectUrl: active.hppUrl, resumed: true };
    return { kind: "ERROR", status: 409, error: "A payment for this invoice is already being processed." };
  }

  const referenceId = buildReferenceId(invoice.invoiceNumber);
  const attempt = await db.payment.create({
    data: {
      invoiceId: invoice.id,
      providerId: provider.id,
      providerCode: provider.code,
      providerName: def.name,
      paymentMethod: input.paymentMethod,
      amount: invoice.amount.toFixed(2),
      currency: invoice.currency,
      status: "INITIATING",
      referenceId,
    },
  });

  // ---- Provider call (WAAFI HPP_PURCHASE per official docs) ----
  const callbackBase = input.origin.replace(/\/+$/, "");
  const result = await createWaafiHostedPurchase({
    credentials: {
      merchantUid: credentials.merchantUid,
      storeId: credentials.storeId,
      hppKey: credentials.hppKey,
    },
    isSandbox: provider.isSandbox,
    paymentMethod: input.paymentMethod,
    ...(methodRequiresPayerAccount(input.paymentMethod) ? { payerSubscriptionId: phone } : {}),
    amount: Number(invoice.amount.toFixed(2)),
    currency: invoice.currency,
    referenceId,
    description: `${invoice.invoiceNumber} — ${invoice.projectService}`.slice(0, 255),
    successCallbackUrl: `${callbackBase}/api/pay/callback?ref=${encodeURIComponent(referenceId)}&result=success`,
    failureCallbackUrl: `${callbackBase}/api/pay/callback?ref=${encodeURIComponent(referenceId)}&result=failure`,
  });

  if (result.ok) {
    await db.payment.update({
      where: { id: attempt.id },
      data: { status: "INITIATED", hppUrl: result.hppUrl, orderId: result.orderId },
    });
    return { kind: "REDIRECT", redirectUrl: result.hppUrl, resumed: false };
  }

  // Provider rejected the initiation — keep the audit record, self-heal
  // the invoice back to PENDING so the customer can retry or pick another
  // provider/method.
  await db.payment.update({
    where: { id: attempt.id },
    data: {
      status: "FAILED",
      failureReason: result.message,
    },
  });
  await db.invoice.updateMany({
    where: { id: invoice.id, status: "PROCESSING" },
    data: { status: "PENDING" },
  });
  return { kind: "ERROR", status: 502, error: result.message };
}

/* --------------------------- callbacks --------------------------- */

export type CallbackOutcome = {
  /** Invoice token for the customer's landing page (null = unknown ref). */
  token: string | null;
  result: "success" | "failure";
};

/**
 * Records a provider callback (hppSuccessCallbackUrl / hppFailureCallbackUrl).
 * UNTRUSTED by design: it never marks anything PAID — it only records the
 * event, and on FAILURE releases the invoice back to PENDING so the client
 * can retry. The PAID transition happens exclusively in the server-side
 * verification flow (Phase 4). Idempotent: repeated callbacks for the same
 * attempt are no-ops.
 */
export async function recordProviderCallback(params: {
  referenceId: string | null;
  result: "success" | "failure";
  raw: Record<string, unknown>;
}): Promise<CallbackOutcome> {
  const { referenceId, result, raw } = params;
  if (!referenceId) return { token: null, result };

  const attempt = await db.payment.findUnique({ where: { referenceId } });
  if (!attempt) return { token: null, result };

  const invoice = await db.invoice.findUnique({ where: { id: attempt.invoiceId } });

  // Idempotency: only a not-yet-concluded attempt transitions again.
  const transitional = attempt.status === "INITIATING" || attempt.status === "INITIATED";
  if (transitional) {
    const nextStatus = result === "success" ? "CALLBACK_SUCCESS" : "CALLBACK_FAILURE";
    await db.payment.update({
      where: { id: attempt.id },
      data: {
        status: nextStatus,
        callbackData: JSON.stringify(raw).slice(0, 4000),
      },
    });
    if (result === "failure") {
      // Payment failed or was aborted at the provider — allow a retry.
      await db.invoice.updateMany({
        where: { id: attempt.invoiceId, status: "PROCESSING" },
        data: { status: "PENDING" },
      });
    }
    // result === "success": invoice stays PROCESSING until verification
    // (Phase 4) confirms and flips it to PAID.
  }

  return { token: invoice?.token ?? null, result };
}
