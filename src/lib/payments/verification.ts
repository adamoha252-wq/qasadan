import "server-only";

/**
 * Server-side payment VERIFICATION (Phase 4, spec §5/§6).
 *
 * Zero-trust model:
 *  - NOTHING the browser says matters: the only inputs are the invoice token
 *    (authorization) and OUR database. The provider's API is the single
 *    source of truth — verification asks WAAFI Pay directly whether the
 *    transaction we initiated (by our unique referenceId) was approved.
 *  - A PAID transition happens ONLY here:
 *      1. the provider positively reports the transaction as Approved, AND
 *      2. the provider-reported amount + currency match the attempt, AND
 *      3. the idempotent conditional updates (updateMany) win the race —
 *         duplicate verifications, concurrent webhook + client checks and
 *         replays can never double-process a payment (spec §6).
 *  - Negative provider outcomes (declined / cancelled / timeout / expired)
 *    mark the attempt FAILED and release the invoice back to PENDING so the
 *    customer can retry — no money moved in those states per the docs.
 *  - Verification ERRORS (provider unreachable, bad credentials) NEVER
 *    change any state: an infrastructure problem is not a payment failure.
 *  - Amount/currency MISMATCH: the attempt keeps its open status (so the
 *    checkout keeps blocking new initiations — no double payment) and the
 *    discrepancy is recorded on the attempt as the audit trail; the
 *    invoice STAYS PROCESSING until an administrator reviews it in the
 *    payment history and uses the Release tool if appropriate.
 */

import { db } from "@/lib/db";
import { loadCredentials } from "./credentials";
import { getProviderDefinition } from "./registry";
import { formatInvoiceDate } from "./invoice-types";
import { getWaafiTransactionInfo } from "./waafipay";
import type { PaymentReceiptView } from "./payment-types";

/** Attempts whose provider-side transaction may still be verifiable. */
const VERIFIABLE = ["INITIATING", "INITIATED", "CALLBACK_SUCCESS"] as const;
/** An INITIATING row older than this is dead (mirrors checkout.ts). */
const STALE_INITIATING_MS = 3 * 60 * 1000;

/* ------------------------- rate limiting ------------------------- */
// Public verification endpoint limiter (per invoice token) — verification
// performs a live provider API call, so polling must stay bounded.
// In-memory like the initiation limiter (see DEPLOYMENT.md §9/§11).
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_MAX = 12;
const verifyBuckets = new Map<string, { count: number; firstAt: number }>();

export function checkVerificationRate(token: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = verifyBuckets.get(token);
  if (!entry || now - entry.firstAt > VERIFY_WINDOW_MS) {
    verifyBuckets.set(token, { count: 1, firstAt: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > VERIFY_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.firstAt + VERIFY_WINDOW_MS - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/* ------------------------- public outcome ------------------------- */

export type VerifyClientOutcome =
  | { state: "PAID"; payment: PaymentReceiptView }
  | { state: "CONFIRMING"; message: string }
  | { state: "DECLINED"; message: string }
  | { state: "RATE_LIMITED"; retryAfterSec: number }
  | { state: "NOT_FOUND" };

/* ------------------------- view builders ------------------------- */

/** Registry display label for a provider payment method code. */
export function paymentMethodLabel(providerCode: string, methodCode: string): string {
  const def = getProviderDefinition(providerCode);
  return def?.methods.find((m) => m.code === methodCode)?.label ?? methodCode;
}

function toReceiptView(
  invoice: {
    invoiceNumber: string;
    clientName: string;
    projectService: string;
    currency: string;
    paidAt: Date | null;
  },
  payment: {
    amount: { toFixed: (digits: number) => string };
    providerCode: string;
    providerName: string;
    paymentMethod: string;
    providerTxnId: string | null;
    verifiedAt: Date | null;
    updatedAt: Date;
  }
): PaymentReceiptView {
  const paidAt = payment.verifiedAt ?? invoice.paidAt ?? payment.updatedAt;
  return {
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    projectService: invoice.projectService,
    amount: payment.amount.toFixed(2),
    currency: invoice.currency,
    providerName: payment.providerName,
    methodLabel: paymentMethodLabel(payment.providerCode, payment.paymentMethod),
    transactionId: payment.providerTxnId,
    paidAt: paidAt.toISOString(),
    paidAtLabel: formatInvoiceDate(paidAt),
  };
}

/**
 * PRIVACY-SAFE receipt view for the public success page + PDF receipt
 * (spec §7). Returns data ONLY for a PAID invoice with a verified
 * (SUCCEEDED) payment attempt; null otherwise (renders as 404 / no panel).
 * Inline await + sanitized return value — RSC flight-stream safety, see
 * findInvoiceClientViewByToken in invoices.ts.
 */
export async function findReceiptViewByToken(token: string): Promise<PaymentReceiptView | null> {
  const row = await db.invoice.findUnique({
    where: { token },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!row || row.status !== "PAID") return null;
  const paid = row.payments.find((p) => p.status === "SUCCEEDED");
  if (!paid) return null;
  return toReceiptView(row, paid);
}

/* ------------------------- verification ------------------------- */

type AttemptRow = {
  id: string;
  invoiceId: string;
  providerId: string;
  providerCode: string;
  providerName: string;
  paymentMethod: string;
  amount: { toFixed: (digits: number) => string };
  currency: string;
  status: string;
  referenceId: string;
};

type InvoiceRow = {
  id: string;
  status: string;
};

function capJson(value: unknown): string {
  try {
    return JSON.stringify(value)?.slice(0, 4000) ?? "";
  } catch {
    return "";
  }
}

/**
 * The idempotent PAID transition (spec §6 — no duplicate processing).
 * Both updates are conditional (updateMany) so concurrent verifications,
 * webhook + client racing, or replayed events can never double-apply.
 */
async function markPaymentSucceeded(
  attempt: AttemptRow,
  verified: {
    transactionId: string | null;
    payerId: string | null;
    raw: Record<string, unknown>;
  }
): Promise<void> {
  const now = new Date();
  // Positive provider confirmation wins over ANY prior local state except
  // an earlier SUCCEEDED transition (idempotent no-op then).
  await db.payment.updateMany({
    where: {
      id: attempt.id,
      status: { in: ["INITIATING", "INITIATED", "CALLBACK_SUCCESS", "CALLBACK_FAILURE", "FAILED"] },
    },
    data: {
      status: "SUCCEEDED",
      providerTxnId: verified.transactionId,
      payerAccount: verified.payerId,
      verifiedAt: now,
      verificationData: capJson(verified.raw),
      failureReason: null,
    },
  });
  await db.invoice.updateMany({
    where: { id: attempt.invoiceId, status: { in: ["PENDING", "PROCESSING"] } },
    data: { status: "PAID", paidAt: now },
  });
}

/** Core zero-trust verification of one attempt against the provider API. */
async function runCoreVerification(attempt: AttemptRow, invoice: InvoiceRow): Promise<VerifyClientOutcome> {
  const def = getProviderDefinition(attempt.providerCode);

  // Fast path: already verified (concurrent call / replayed webhook).
  if (attempt.status === "SUCCEEDED") {
    const receipt = await findReceiptViewByInvoiceId(invoice.id);
    if (receipt) return { state: "PAID", payment: receipt };
  }

  if (!def || !def.implemented) {
    return {
      state: "CONFIRMING",
      message: "Verification for this provider is not available yet — the QASADAN team will confirm your payment manually.",
    };
  }

  const provider = await db.paymentProvider.findUnique({ where: { code: attempt.providerCode } });
  if (!provider) {
    return {
      state: "CONFIRMING",
      message: "The payment provider is no longer configured — the QASADAN team will confirm your payment manually.",
    };
  }
  const { values: credentials } = loadCredentials(provider);
  const missing = def.requiredFields.filter((k) => !credentials[k]?.trim());
  if (missing.length > 0) {
    return {
      state: "CONFIRMING",
      message: "The payment provider is temporarily not fully configured — please check again shortly.",
    };
  }

  const result = await getWaafiTransactionInfo({
    credentials: {
      merchantUid: credentials.merchantUid,
      storeId: credentials.storeId,
      hppKey: credentials.hppKey,
    },
    isSandbox: provider.isSandbox,
    referenceId: attempt.referenceId,
  });

  switch (result.kind) {
    case "CONFIRMED": {
      // Amount/currency cross-check against OUR attempt snapshot.
      const expectedAmount = Number(attempt.amount.toFixed(2));
      const amountOk =
        result.amount === null || Math.abs(result.amount - expectedAmount) <= 0.011;
      const currencyOk =
        !result.currency || result.currency.toUpperCase() === attempt.currency.toUpperCase();

      if (amountOk && currencyOk) {
        await markPaymentSucceeded(attempt, {
          transactionId: result.transactionId,
          payerId: result.payerId,
          raw: result.raw,
        });
        const receipt = await findReceiptViewByInvoiceId(invoice.id);
        if (receipt) return { state: "PAID", payment: receipt };
        return {
          state: "CONFIRMING",
          message: "Your payment was verified — refreshing the page…",
        };
      }

      // MISMATCH — security flag. The attempt KEEPS its open (verifiable)
      // status so the checkout keeps blocking new initiations (spec §6 —
      // prevent duplicate payments): the provider reported an amount that
      // does not match what we requested, so money may have moved. The
      // discrepancy is recorded for the admin, who reviews it in the
      // payment history and can release the invoice when appropriate.
      await db.payment.update({
        where: { id: attempt.id },
        data: {
          failureReason: `Verification mismatch — provider reported ${result.amount ?? "?"} ${
            result.currency ?? "?"
          }, expected ${attempt.amount.toFixed(2)} ${attempt.currency}. Manual review required.`,
          verifiedAt: new Date(),
          verificationData: capJson(result.raw),
        },
      });
      return {
        state: "CONFIRMING",
        message:
          "We received your payment but could not match it automatically — the QASADAN team will confirm it for you shortly.",
      };
    }

    case "DECLINED": {
      // Definitive negative outcome — no money moved per the provider.
      // Record the reason and release the invoice so the customer can retry.
      if (attempt.status !== "FAILED") {
        await db.payment.update({
          where: { id: attempt.id },
          data: {
            status: "FAILED",
            failureReason: `Provider reported "${result.status ?? "declined"}" at verification.`,
            verifiedAt: new Date(),
            verificationData: capJson(result.raw),
          },
        });
      }
      await db.invoice.updateMany({
        where: { id: invoice.id, status: "PROCESSING" },
        data: { status: "PENDING" },
      });
      return {
        state: "DECLINED",
        message:
          "The payment did not complete — no money has left your account. You can try again in a moment.",
      };
    }

    case "PENDING":
      return {
        state: "CONFIRMING",
        message:
          "Your payment has not been confirmed by the provider yet — if you just paid, check again in a minute or two.",
      };

    case "ERROR":
      // Infrastructure/configuration problem — NEVER a payment failure.
      return {
        state: "CONFIRMING",
        message: "Could not verify the payment just now — please check again in a few minutes.",
      };
  }
}

/** Receipt view by invoice id (PAID + SUCCEEDED attempt required). */
async function findReceiptViewByInvoiceId(invoiceId: string): Promise<PaymentReceiptView | null> {
  const row = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!row || row.status !== "PAID") return null;
  const paid = row.payments.find((p) => p.status === "SUCCEEDED");
  if (!paid) return null;
  return toReceiptView(row, paid);
}

/**
 * Public verification entry point (POST /api/pay/[token]/verify).
 * The 192-bit token in the URL is the authorization (same model as the
 * /pay page). Idempotent: verifying a PAID invoice is a fast no-op.
 */
export async function verifyInvoicePaymentByToken(token: string): Promise<VerifyClientOutcome> {
  const invoice = await db.invoice.findUnique({ where: { token } });
  if (!invoice) return { state: "NOT_FOUND" };

  if (invoice.status === "PAID") {
    const receipt = await findReceiptViewByInvoiceId(invoice.id);
    if (receipt) return { state: "PAID", payment: receipt };
    return { state: "NOT_FOUND" };
  }

  if (invoice.status !== "PROCESSING") {
    return {
      state: "CONFIRMING",
      message: "There is no payment in progress for this invoice.",
    };
  }

  const attempts = await db.payment.findMany({
    where: { invoiceId: invoice.id, status: { in: [...VERIFIABLE, "SUCCEEDED"] } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const now = Date.now();
  const attempt = attempts.find(
    (a) => a.status !== "INITIATING" || now - a.createdAt.getTime() <= STALE_INITIATING_MS
  );
  if (!attempt) {
    return {
      state: "CONFIRMING",
      message: "There is no active payment for this invoice right now.",
    };
  }

  return runCoreVerification(attempt, invoice);
}

/**
 * Webhook entry point (POST /api/pay/webhook/[provider]).
 * The webhook payload itself is UNTRUSTED — after the HMAC-SHA256 signature
 * check in the route, the ONLY thing used from it is our own referenceId;
 * the actual PAID decision is always re-made against the provider API
 * (HPP_GETTRANINFO) inside runCoreVerification. Naturally idempotent:
 * replays hit the SUCCEEDED fast path / conditional updates.
 */
export async function verifyAttemptByReferenceId(
  referenceId: string
): Promise<VerifyClientOutcome | null> {
  const attempt = await db.payment.findUnique({ where: { referenceId } });
  if (!attempt) return null; // unknown reference — route answers 200, no leak
  const invoice = await db.invoice.findUnique({ where: { id: attempt.invoiceId } });
  if (!invoice) return null;
  return runCoreVerification(attempt, invoice);
}
