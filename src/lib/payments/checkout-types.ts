/**
 * Client checkout — shared types and helpers (safe for client AND server).
 *
 * Phase 3 of the QASADAN payment system (spec §4): the customer opens
 * /pay/<token>, selects a provider (only the ones the admin activated),
 * then a payment method of that provider, and pays. The selection UI is
 * PUBLIC — that is the whole point: clients must see and choose how they
 * pay. No secrets ever appear here: these shapes contain only catalog data
 * (provider name, methods, labels) that the admin deliberately made public
 * by activating the provider.
 */

/**
 * Payment methods that require the customer's account identifier up-front.
 * For WAAFI Pay, HPP_PURCHASE requires payerInfo.subscriptionId (the mobile
 * number in international format, no "+") when paymentMethod is
 * MWALLET_ACCOUNT — the hosted page pre-fills it and it is not editable
 * there (official docs: https://docs.waafipay.com/hpp-api).
 */
export const METHODS_REQUIRING_PAYER_ACCOUNT = ["MWALLET_ACCOUNT"] as const;

export function methodRequiresPayerAccount(methodCode: string): boolean {
  return (METHODS_REQUIRING_PAYER_ACCOUNT as readonly string[]).includes(methodCode);
}

/**
 * Normalizes a phone number typed by the customer: strips spaces, dashes,
 * parentheses and a leading "+" — the provider wants plain international
 * digits (e.g. 252611111111).
 */
export function normalizePayerPhone(value: string): string {
  return value.replace(/[\s\-().]/g, "").replace(/^\+/, "");
}

/**
 * Sanity validation of the normalized number: 8–15 digits, no leading zero
 * (international format — e.g. 252… for Somalia, 253… for Djibouti).
 */
export function isValidPayerPhone(value: string): boolean {
  return /^[1-9][0-9]{7,14}$/.test(value);
}

/** A payment method as shown to the customer on the checkout page. */
export type CheckoutMethod = {
  code: string;
  label: string;
  description?: string;
  /** true = the customer must provide their account/phone number first. */
  requiresPayerAccount: boolean;
};

/** A payment provider as shown to the customer on the checkout page. */
export type CheckoutProvider = {
  code: string;
  name: string;
  tagline: string;
  /** lucide icon name (rendered via the shared provider-icon component). */
  icon: string;
  methods: CheckoutMethod[];
};

/** Why an invoice cannot be paid right now (drives the UI messaging). */
export type CheckoutBlockedReason =
  | "ALREADY_PAID"
  | "PAYMENT_PROCESSING"
  | "CANCELLED"
  | "EXPIRED"
  | "OVERDUE"
  | "NO_PROVIDERS"
  | "NOT_PAYABLE";

/**
 * Everything the public checkout page needs to render the selection flow.
 * All data here is deliberately public (provider catalog + labels).
 */
export type CheckoutOptions = {
  /** true = the selection UI + Pay Now flow should be shown. */
  payable: boolean;
  /** Set when payable is false. */
  reason: CheckoutBlockedReason | null;
  /** Public providers that can pay THIS invoice (currency-compatible). */
  providers: CheckoutProvider[];
  /**
   * For a PROCESSING invoice: the hosted-checkout URL of the in-flight
   * attempt, so the customer can resume where they left off. null otherwise.
   */
  resumeUrl: string | null;
};
