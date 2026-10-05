import "server-only";
import crypto, { randomUUID } from "node:crypto";

/**
 * WAAFI Pay adapter — implemented strictly against the official API docs:
 * https://docs.waafipay.com/
 *
 * Key facts (from the docs):
 *  - ONE unified endpoint: POST {base}/asm — the action is chosen with
 *    `serviceName` in the JSON body (no REST paths).
 *  - Sandbox base:    https://sandbox.waafipay.com/asm
 *    Production base:  https://api.waafipay.net/asm
 *  - Credentials are passed inside `serviceParams`:
 *      Hosted checkout set:  merchantUid + storeId + hppKey
 *      Direct API set:       merchantUid + apiUserId + apiKey
 *  - responseCode "2001" (RCS_SUCCESS) means the request itself processed.
 *    Invalid credentials return responseCode "5001" (errorCode "1001",
 *    "Authentication failed"); an invalid HPP key returns "5301".
 *
 * Phase 1 uses WEBHOOK_LIST (a read-only service) as the connection test:
 * it authenticates the merchant credentials without creating or touching
 * any payment.
 */

import type { ConnectionTestOutcome } from "./types";

/**
 * Unified API endpoints (official docs: /api-introduction).
 * The env overrides (WAAFIPAY_SANDBOX_URL / WAAFIPAY_PRODUCTION_URL) are
 * OPTIONAL — they default to the documented endpoints and exist for
 * corporate proxy setups and automated end-to-end testing.
 */
export const WAAFIPAY_ENDPOINTS = {
  sandbox: process.env.WAAFIPAY_SANDBOX_URL ?? "https://sandbox.waafipay.com/asm",
  production: process.env.WAAFIPAY_PRODUCTION_URL ?? "https://api.waafipay.net/asm",
} as const;

const REQUEST_TIMEOUT_MS = 15_000;

export type WaafiServiceName =
  | "API_PURCHASE"
  | "API_REVERSAL"
  | "HPP_PURCHASE"
  | "HPP_REFUNDPURCHASE"
  | "HPP_GETTRANINFO"
  | "HPP_GETRESULTINFO"
  | "WEBHOOK_REGISTER"
  | "WEBHOOK_LIST"
  | "WEBHOOK_UPDATE"
  | "WEBHOOK_DELETE";

/** Envelope every WAAFI Pay request must use (per /api-introduction). */
export function buildWaafiRequest(
  serviceName: WaafiServiceName,
  serviceParams: Record<string, unknown>
) {
  return {
    schemaVersion: "1.0",
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
    channelName: "WEB",
    serviceName,
    serviceParams,
  };
}

type WaafiResponse = {
  schemaVersion?: string;
  responseCode?: string;
  errorCode?: string;
  responseMsg?: string;
  params?: Record<string, unknown>;
};

/** Low-level call to the unified /asm endpoint. NEVER log serviceParams. */
export async function callWaafi(
  baseUrl: string,
  serviceName: WaafiServiceName,
  serviceParams: Record<string, unknown>
): Promise<WaafiResponse> {
  let response: Response;
  try {
    response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildWaafiRequest(serviceName, serviceParams)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? "the request timed out"
        : "the server could not be reached";
    throw new Error(`Could not reach WAAFI Pay — ${reason}. Check your connection and try again.`);
  }

  if (!response.ok) {
    throw new Error(`WAAFI Pay returned HTTP ${response.status}. Try again in a moment.`);
  }

  try {
    return (await response.json()) as WaafiResponse;
  } catch {
    throw new Error("WAAFI Pay returned an unreadable response.");
  }
}

export type WaafiCredentials = {
  merchantUid?: string;
  storeId?: string;
  hppKey?: string;
  apiUserId?: string;
  apiKey?: string;
};

export type TestResult = {
  outcome: ConnectionTestOutcome;
  message: string;
};

/**
 * Tests the connection to WAAFI Pay.
 *
 * 1. If the hosted-checkout credential set is complete, performs a LIVE,
 *    read-only WEBHOOK_LIST call — WAAFI Pay authenticates the merchant and
 *    we learn definitively whether the credentials are valid.
 * 2. Otherwise validates the formats of whatever is configured and reports
 *    what is missing for a live test (PARTIAL).
 */
export async function testWaafiConnection(
  credentials: WaafiCredentials,
  isSandbox: boolean
): Promise<TestResult> {
  const baseUrl = isSandbox ? WAAFIPAY_ENDPOINTS.sandbox : WAAFIPAY_ENDPOINTS.production;
  const envLabel = isSandbox ? "sandbox" : "production";
  const { merchantUid, storeId, hppKey, apiUserId, apiKey } = credentials;

  const problems = validateWaafiFormats(credentials);
  if (problems.length > 0) {
    return {
      outcome: "FAIL",
      message: `Credential format check failed — ${problems.join(" ")}`,
    };
  }

  // Live, read-only authentication check via WEBHOOK_LIST.
  if (merchantUid && storeId && hppKey) {
    let resp: WaafiResponse;
    try {
      resp = await callWaafi(baseUrl, "WEBHOOK_LIST", { merchantUid, storeId, hppKey });
    } catch (error) {
      return {
        outcome: "FAIL",
        message: error instanceof Error ? error.message : "Connection test failed.",
      };
    }

    if (resp.responseCode === "2001") {
      return {
        outcome: "PASS",
        message: `Connected successfully — WAAFI Pay (${envLabel}) accepted the credentials.`,
      };
    }

    const code = resp.responseCode ?? "unknown";
    if (code === "5001" || resp.errorCode === "1001" || code === "5301" || code === "5304") {
      return {
        outcome: "FAIL",
        message: `WAAFI Pay (${envLabel}) rejected the credentials (code ${code}${
          resp.errorCode ? `, error ${resp.errorCode}` : ""
        }) — check the Merchant UID, Store ID and HPP Key.`,
      };
    }

    return {
      outcome: "FAIL",
      message: `WAAFI Pay (${envLabel}) responded with code ${code}${
        resp.responseMsg ? ` (${resp.responseMsg})` : ""
      }.`,
    };
  }

  // No hosted-checkout set → format-only verification.
  const hasApiSet = Boolean(merchantUid && apiUserId && apiKey);
  if (hasApiSet) {
    return {
      outcome: "PARTIAL",
      message:
        "Direct API credentials passed the format check. A live connection test needs the Hosted Checkout credentials (Merchant UID, Store ID and HPP Key), which are also required for the client checkout flow.",
    };
  }

  return {
    outcome: "PARTIAL",
    message:
      "Saved credentials passed the format check, but the Hosted Checkout set (Merchant UID, Store ID and HPP Key) is incomplete — a live connection test will run once they are added.",
  };
}

/** Format rules from the official docs (loose bounds so valid keys never get blocked). */
export function validateWaafiFormats(credentials: WaafiCredentials): string[] {
  const problems: string[] = [];
  const { merchantUid, storeId, hppKey, apiUserId, apiKey } = credentials;

  if (merchantUid !== undefined) {
    if (merchantUid.length < 5 || merchantUid.length > 40) {
      problems.push("Merchant UID must be 5–40 characters.");
    }
    if (!/^[A-Za-z0-9_-]+$/.test(merchantUid)) {
      problems.push("Merchant UID may only contain letters, numbers, - and _.");
    }
  }
  if (storeId !== undefined && (storeId.length < 3 || storeId.length > 40)) {
    problems.push("Store ID must be 3–40 characters.");
  }
  if (hppKey !== undefined && (hppKey.length < 16 || hppKey.length > 64)) {
    problems.push("HPP Key must be 16–64 characters.");
  }
  if (apiUserId !== undefined && (apiUserId.length < 5 || apiUserId.length > 40)) {
    problems.push("API User ID must be 5–40 characters.");
  }
  if (apiKey !== undefined && (apiKey.length < 16 || apiKey.length > 64)) {
    problems.push("API Key must be 16–64 characters.");
  }
  return problems;
}

/* ==================================================================== */
/* ============ Hosted Payment Page (HPP) — client checkout ============ */
/* ==================================================================== */

/**
 * Initiates a hosted-checkout purchase (official docs: /hpp-api,
 * "Initiate Purchase"). The customer is redirected to the returned hppUrl
 * and completes the payment on WAAFI Pay's secure page — their account
 * details never pass through QASADAN.
 *
 * Request per docs (serviceParams):
 *   merchantUid, storeId, hppKey          — HPP credentials
 *   paymentMethod                          — MWALLET_ACCOUNT | CREDIT_CARD | …
 *   payerInfo.subscriptionId               — REQUIRED for MWALLET_ACCOUNT:
 *                                           customer mobile, international
 *                                           format without "+" (e.g.
 *                                           252611111111); pre-filled on the
 *                                           hosted page and NOT editable there
 *   hppSuccessCallbackUrl / hppFailureCallbackUrl — HTTPS, success URL must
 *                                           return HTTP 200
 *   hppRespDataFormat                      — 1=POST, 2=GET, 4=Result Token
 *   transactionInfo.{referenceId,amount,currency,description}
 *                                           referenceId: our unique merchant
 *                                           reference (letters/numbers/-/_/.)
 *
 * Response on responseCode "2001": params.hppUrl (the hosted checkout URL),
 * params.orderId, params.referenceId. "2001" means the request was processed
 * — NOT that the transaction was captured; verification is a separate step
 * (HPP_GETTRANINFO / webhooks — Phase 4).
 */
export type WaafiHppPurchaseInput = {
  credentials: WaafiCredentials; // must contain merchantUid + storeId + hppKey
  isSandbox: boolean;
  paymentMethod: string;
  /** Required when paymentMethod is MWALLET_ACCOUNT. */
  payerSubscriptionId?: string;
  amount: number; // two decimal places (provider truncates beyond 2dp)
  currency: string; // e.g. USD, SLSH, DJF
  referenceId: string; // our unique merchant reference (1–50 chars)
  description?: string; // 0–255 chars
  successCallbackUrl: string; // HTTPS
  failureCallbackUrl: string; // HTTPS
};

export type WaafiHppPurchaseOk = {
  ok: true;
  hppUrl: string;
  orderId: string | null;
  referenceId: string | null;
};

export type WaafiHppPurchaseError = {
  ok: false;
  /** WAAFI responseCode when the API answered, null for transport errors. */
  responseCode: string | null;
  errorCode: string | null;
  message: string; // sanitized, customer-safe
};

export type WaafiHppPurchaseResult = WaafiHppPurchaseOk | WaafiHppPurchaseError;

/** Known WAAFI response codes mapped to clean, actionable messages. */
function hppErrorMessage(resp: WaafiResponse, envLabel: string): string {
  const code = resp.responseCode ?? "unknown";
  const msg = resp.responseMsg ? ` (${resp.responseMsg})` : "";
  if (code === "5301") {
    return `WAAFI Pay (${envLabel}) rejected the HPP Key (code 5301). The QASADAN team must review the payment provider credentials.`;
  }
  if (code === "5001" || resp.errorCode === "1001") {
    return `WAAFI Pay (${envLabel}) rejected the merchant credentials (code ${code}${resp.errorCode ? `, error ${resp.errorCode}` : ""}). The QASADAN team must review the payment provider configuration.`;
  }
  if (code === "5304" || code === "5305") {
    return `WAAFI Pay (${envLabel}) flagged this payment reference (code ${code}). Please try again in a moment.`;
  }
  return `WAAFI Pay (${envLabel}) could not start the payment (code ${code}${resp.errorCode ? `, error ${resp.errorCode}` : ""})${msg}. Please try again shortly.`;
}

export async function createWaafiHostedPurchase(
  input: WaafiHppPurchaseInput
): Promise<WaafiHppPurchaseResult> {
  const baseUrl = input.isSandbox ? WAAFIPAY_ENDPOINTS.sandbox : WAAFIPAY_ENDPOINTS.production;
  const envLabel = input.isSandbox ? "sandbox" : "production";
  const { merchantUid, storeId, hppKey } = input.credentials;
  if (!merchantUid || !storeId || !hppKey) {
    return {
      ok: false,
      responseCode: null,
      errorCode: null,
      message: "The payment provider is not fully configured. The QASADAN team has been notified by this record.",
    };
  }

  // Docs show storeId as a number in the request example; send it as a JSON
  // number when it is numeric (and safe — ≤15 digits), otherwise as a string
  // (alphanumeric store IDs must also be accepted).
  const storeIdParam: string | number =
    /^\d{1,15}$/.test(storeId) ? Number(storeId) : storeId;

  const serviceParams: Record<string, unknown> = {
    merchantUid,
    storeId: storeIdParam,
    hppKey,
    paymentMethod: input.paymentMethod,
    hppSuccessCallbackUrl: input.successCallbackUrl,
    hppFailureCallbackUrl: input.failureCallbackUrl,
    hppRespDataFormat: 2, // 2 = GET — results arrive as URL query params
    transactionInfo: {
      referenceId: input.referenceId,
      amount: input.amount,
      currency: input.currency,
      ...(input.description ? { description: input.description.slice(0, 255) } : {}),
    },
  };
  if (input.payerSubscriptionId) {
    serviceParams.payerInfo = { subscriptionId: input.payerSubscriptionId };
  }

  let resp: WaafiResponse;
  try {
    resp = await callWaafi(baseUrl, "HPP_PURCHASE", serviceParams);
  } catch (error) {
    return {
      ok: false,
      responseCode: null,
      errorCode: null,
      message:
        error instanceof Error
          ? error.message
          : "Could not reach the payment provider. Please try again in a moment.",
    };
  }

  if (resp.responseCode === "2001") {
    const params = resp.params ?? {};
    const hppUrl = typeof params.hppUrl === "string" ? params.hppUrl : "";
    if (!hppUrl) {
      return {
        ok: false,
        responseCode: resp.responseCode,
        errorCode: resp.errorCode ?? null,
        message: `WAAFI Pay (${envLabel}) accepted the request but returned no checkout URL. Please try again.`,
      };
    }
    return {
      ok: true,
      hppUrl,
      orderId: typeof params.orderId === "string" ? params.orderId : null,
      referenceId: typeof params.referenceId === "string" ? params.referenceId : null,
    };
  }

  return {
    ok: false,
    responseCode: resp.responseCode ?? null,
    errorCode: resp.errorCode ?? null,
    message: hppErrorMessage(resp, envLabel),
  };
}

/* ==================================================================== */
/* ============ Phase 4: server-side transaction verification ========== */
/* ==================================================================== */

/**
 * Retrieves the authoritative status of a hosted-checkout transaction
 * (official docs: /hpp-api, "Retrieve Transaction Information",
 * serviceName HPP_GETTRANINFO).
 *
 * Request per docs (serviceParams): merchantUid, storeId, hppKey (the HPP
 * credential set) + referenceId — the merchant reference we sent with
 * HPP_PURCHASE. lookup by referenceId is the only fully documented form.
 *
 * Response (responseCode "2001") params include:
 *   tranStatusDesc, amount, tranAmount, payerId, paymentMethod, tranDate,
 *   currency, invoiceId, referenceId, transactionId, tranStatusId, status
 * The docs document status "Approved" as the approved/paid state (example:
 * status:"Approved", tranStatusId:"3"); declined/failed/cancelled/expired/
 * timeout are the negative states (documented for refunds + webhooks).
 * tranStatusId values are NOT enumerated in the docs — the string status is
 * therefore the primary signal, matched case-insensitively.
 */
export type WaafiTranInfoResult =
  | {
      /** Provider positively reports the transaction as approved. */
      kind: "CONFIRMED";
      transactionId: string | null;
      /** Provider status label, e.g. "Approved". */
      status: string;
      /** Provider-reported amount (params.amount, fallback params.tranAmount). */
      amount: number | null;
      currency: string | null;
      payerId: string | null;
      tranDate: string | null;
      /** Raw response params (caller persists a capped snapshot). */
      raw: Record<string, unknown>;
    }
  | {
      /** Provider definitively reports a negative outcome (no money moved). */
      kind: "DECLINED";
      status: string | null;
      raw: Record<string, unknown>;
    }
  | {
      /** Transaction exists but is not concluded yet (or unknown status). */
      kind: "PENDING";
      status: string | null;
    }
  | {
      /** Could not verify (transport / authentication / config problem).
       *  NEVER changes any payment state — this is not a payment failure. */
      kind: "ERROR";
      message: string;
      responseCode: string | null;
    };

/** Status strings the docs associate with definitive negative outcomes. */
const NEGATIVE_TRAN_STATUSES = new Set([
  "declined",
  "failed",
  "cancel",
  "cancelled",
  "canceled",
  "expired",
  "timeout",
  "timed out",
  "reversed",
  "refunded",
]);

export async function getWaafiTransactionInfo(input: {
  credentials: WaafiCredentials; // merchantUid + storeId + hppKey required
  isSandbox: boolean;
  referenceId: string; // our unique merchant reference (QSD-…)
}): Promise<WaafiTranInfoResult> {
  const baseUrl = input.isSandbox ? WAAFIPAY_ENDPOINTS.sandbox : WAAFIPAY_ENDPOINTS.production;
  const envLabel = input.isSandbox ? "sandbox" : "production";
  const { merchantUid, storeId, hppKey } = input.credentials;
  if (!merchantUid || !storeId || !hppKey) {
    return {
      kind: "ERROR",
      message: "The payment provider is not fully configured for verification.",
      responseCode: null,
    };
  }

  const storeIdParam: string | number = /^\d{1,15}$/.test(storeId) ? Number(storeId) : storeId;

  let resp: WaafiResponse;
  try {
    resp = await callWaafi(baseUrl, "HPP_GETTRANINFO", {
      merchantUid,
      storeId: storeIdParam,
      hppKey,
      referenceId: input.referenceId,
    });
  } catch (error) {
    return {
      kind: "ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Could not reach the payment provider for verification.",
      responseCode: null,
    };
  }

  // Authentication / configuration problems (never a payment failure).
  const code = resp.responseCode ?? null;
  if (code === "5001" || code === "5301" || code === "5304" || resp.errorCode === "1001") {
    return {
      kind: "ERROR",
      message: `WAAFI Pay (${envLabel}) rejected the verification request (code ${code ?? "unknown"}${
        resp.errorCode ? `, error ${resp.errorCode}` : ""
      }). The QASADAN team must review the provider credentials.`,
      responseCode: code,
    };
  }

  if (code !== "2001" || !resp.params) {
    // Any other code: the transaction status is simply not confirmed —
    // safest interpretation is "not concluded yet".
    return { kind: "PENDING", status: resp.responseMsg ?? code };
  }

  const params = resp.params;
  const status =
    (typeof params.status === "string" && params.status) ||
    (typeof params.tranStatusDesc === "string" && params.tranStatusDesc) ||
    null;
  const rawAmount =
    params.amount !== undefined && params.amount !== null && params.amount !== ""
      ? Number(params.amount)
      : params.tranAmount !== undefined && params.tranAmount !== null && params.tranAmount !== ""
        ? Number(params.tranAmount)
        : null;
  const normalizedStatus = (status ?? "").trim().toLowerCase();

  if (normalizedStatus === "" || normalizedStatus === "approved" || normalizedStatus === "success") {
    if (normalizedStatus === "") {
      // 2001 without a status label — cannot positively confirm.
      return { kind: "PENDING", status: null };
    }
    return {
      kind: "CONFIRMED",
      transactionId: typeof params.transactionId === "string" ? params.transactionId : null,
      status: status ?? "Approved",
      amount: rawAmount !== null && Number.isFinite(rawAmount) ? rawAmount : null,
      currency: typeof params.currency === "string" ? params.currency.toUpperCase() : null,
      payerId: typeof params.payerId === "string" ? params.payerId : null,
      tranDate: typeof params.tranDate === "string" ? params.tranDate : null,
      raw: params,
    };
  }

  if (NEGATIVE_TRAN_STATUSES.has(normalizedStatus)) {
    return { kind: "DECLINED", status, raw: params };
  }

  // Unknown/intermediate status label (e.g. "Pending") — not conclusive.
  return { kind: "PENDING", status };
}

/**
 * Verifies the HMAC-SHA256 signature of an incoming WAAFI Pay webhook
 * (official docs: /webhooks).
 *
 * Signing string: "{X-Webhook-Timestamp}.{X-Webhook-Event-Id}.{raw body bytes}"
 * Signature: lowercase hex HMAC-SHA256 of the signing string with the
 * webhook secret issued once at WEBHOOK_REGISTER time — sent in the
 * "X-Webhook-Signature" header. Replays older than 5 minutes are rejected
 * per the docs' verification steps.
 */
export function verifyWaafiWebhookSignature(params: {
  secret: string;
  timestamp: string | null;
  eventId: string | null;
  signature: string | null;
  rawBody: string;
  nowMs?: number;
}): { ok: true } | { ok: false; reason: "MISSING_HEADERS" | "STALE_TIMESTAMP" | "BAD_SIGNATURE" } {
  const { secret, timestamp, eventId, signature, rawBody } = params;
  if (!timestamp || !eventId || !signature) {
    return { ok: false, reason: "MISSING_HEADERS" };
  }
  const ts = Number(timestamp);
  const now = params.nowMs ?? Date.now();
  if (!Number.isFinite(ts) || Math.abs(now - ts * 1000) > 5 * 60 * 1000) {
    return { ok: false, reason: "STALE_TIMESTAMP" };
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${eventId}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "BAD_SIGNATURE" };
  }
  return { ok: true };
}
