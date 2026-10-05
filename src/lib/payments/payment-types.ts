/**
 * Payment attempts — shared display types and helpers (safe for client
 * AND server). Phase 4/5 of the QASADAN payment system.
 *
 * Mirrors invoice-types.ts: status labels, badge classes and the API-safe
 * view shapes. No secrets, no server-only code.
 */

export const PAYMENT_ATTEMPT_STATUSES = [
  "INITIATING", // row created, provider call in flight
  "INITIATED", // provider issued the hosted checkout URL
  "CALLBACK_SUCCESS", // success callback received (untrusted until verified)
  "CALLBACK_FAILURE", // failure/abort callback received — retry allowed
  "SUCCEEDED", // verified paid (server-side verification, Phase 4)
  "FAILED", // provider rejected the initiation or verification failed
] as const;

export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export function isPaymentAttemptStatus(value: string): value is PaymentAttemptStatus {
  return (PAYMENT_ATTEMPT_STATUSES as readonly string[]).includes(value);
}

/** Human labels — shown in the admin payment history. */
export const PAYMENT_STATUS_LABELS: Record<PaymentAttemptStatus, string> = {
  INITIATING: "Starting",
  INITIATED: "Awaiting payment",
  CALLBACK_SUCCESS: "Confirming payment",
  CALLBACK_FAILURE: "Not completed",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
};

/** Tailwind classes for the status badge in the admin table. */
export const PAYMENT_STATUS_BADGE_CLASSES: Record<PaymentAttemptStatus, string> = {
  INITIATING: "bg-slate-100 text-slate-600 border-slate-200",
  INITIATED: "bg-amber-50 text-amber-700 border-amber-200",
  CALLBACK_SUCCESS: "bg-sky-50 text-sky-700 border-sky-200",
  CALLBACK_FAILURE: "bg-orange-50 text-orange-700 border-orange-200",
  SUCCEEDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

export function paymentStatusLabel(status: string): string {
  return isPaymentAttemptStatus(status) ? PAYMENT_STATUS_LABELS[status] : status;
}

export function paymentStatusBadgeClass(status: string): string {
  return isPaymentAttemptStatus(status)
    ? PAYMENT_STATUS_BADGE_CLASSES[status]
    : "bg-slate-100 text-slate-600 border-slate-200";
}

/** Attempt states that still have a live/verifiable transaction at the provider. */
export const VERIFIABLE_ATTEMPT_STATUSES = [
  "INITIATING",
  "INITIATED",
  "CALLBACK_SUCCESS",
] as const;

/**
 * PUBLIC success-page representation of a verified payment (spec §7).
 * Privacy-safe: no invoice id, no client email, no token, no raw provider
 * payloads — only what a payer may legitimately see on their receipt.
 */
export type PaymentReceiptView = {
  invoiceNumber: string;
  clientName: string;
  projectService: string;
  amount: string; // "299.00"
  currency: string;
  /** Display label, e.g. "WAAFI Pay — Mobile Wallet". */
  providerName: string;
  methodLabel: string;
  /** Provider transaction id (e.g. WAAFI transactionId). */
  transactionId: string | null;
  /** When the payment was verified/marked paid. */
  paidAt: string; // ISO
  paidAtLabel: string; // preformatted date for direct rendering
};

/** API-safe representation of a payment attempt for the ADMIN history. */
export type PaymentAdminView = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  clientName: string;
  providerCode: string;
  providerName: string;
  paymentMethod: string; // code, e.g. MWALLET_ACCOUNT
  methodLabel: string; // display label, e.g. "Mobile Wallet"
  amount: string;
  currency: string;
  status: string; // PaymentAttemptStatus
  referenceId: string;
  orderId: string | null;
  providerTxnId: string | null;
  payerAccount: string | null;
  failureReason: string | null;
  hasCallbackData: boolean;
  verifiedAt: string | null;
  createdAt: string;
  /** Only for verified payments on a PAID invoice. */
  receiptUrl: string | null;
  /** The client-facing /pay page (admin convenience link). */
  paymentPageUrl: string | null;
};
