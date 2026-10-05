/**
 * Invoice shared types and helpers (safe for client AND server).
 *
 * No secrets, no server-only code. Both the admin UI and the API routes
 * derive status badges, money formatting and action permissions from here,
 * so the state machine stays consistent everywhere.
 */

export const INVOICE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
};

/** Tailwind classes for the status badge in the admin table. */
export const INVOICE_STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PROCESSING: "bg-sky-50 text-sky-700 border-sky-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
  EXPIRED: "bg-orange-50 text-orange-700 border-orange-200",
  REFUNDED: "bg-violet-50 text-violet-700 border-violet-200",
};

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(value);
}

export function invoiceStatusLabel(status: string): string {
  return isInvoiceStatus(status)
    ? INVOICE_STATUS_LABELS[status]
    : status;
}

export function invoiceStatusBadgeClass(status: string): string {
  return isInvoiceStatus(status)
    ? INVOICE_STATUS_BADGE_CLASSES[status]
    : "bg-slate-100 text-slate-600 border-slate-200";
}

/**
 * A pending invoice past its due date is shown as "Overdue" — the status
 * itself is NOT auto-changed in the database (no surprise transitions).
 */
export function isInvoiceOverdue(
  status: string,
  dueDate: string | Date | null,
  now: Date = new Date()
): boolean {
  if (status !== "PENDING" || !dueDate) return false;
  return new Date(dueDate).getTime() < now.getTime();
}

/**
 * Action policy — mirrors the rules enforced server-side in the API routes.
 * PENDING invoices are editable/cancellable; PAID / REFUNDED records are
 * immutable history. A PROCESSING invoice can be RELEASED back to PENDING
 * by an admin when its payment session can no longer conclude (the release
 * endpoint refuses when a verified payment exists).
 */
export const invoiceActionPolicy = {
  canEdit: (status: string) => status === "PENDING",
  canCancel: (status: string) => status === "PENDING",
  canDelete: (status: string) =>
    status === "PENDING" || status === "CANCELLED" || status === "EXPIRED" || status === "FAILED",
  canRelease: (status: string) => status === "PROCESSING",
} as const;

/** Symbols for common ISO currencies; other codes (e.g. SLSH) render as "code + amount". */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  KES: "KSh ",
};

/** Formats a monetary amount consistently for any provider currency code. */
export function formatMoney(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()];
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency.toUpperCase()}`;
}

/** "Oct 5, 2026" — compact date for tables and summary rows. */
export function formatInvoiceDate(value: string | Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

/** API-safe representation of an invoice for the ADMIN area. */
export type InvoiceAdminView = {
  id: string;
  invoiceNumber: string;
  /** Secret payment-link token — admins need it to build/copy the client link. */
  token: string;
  /** Absolute link built server-side (fallback); the UI prefers window.location.origin. */
  paymentLink: string;
  clientName: string;
  clientEmail: string | null;
  projectService: string;
  description: string | null;
  amount: string; // "299.00"
  currency: string;
  dueDate: string | null;
  status: InvoiceStatus;
  overdue: boolean;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Minimal, privacy-safe invoice shape for the PUBLIC /pay/<token> page. */
export type InvoiceClientView = {
  invoiceNumber: string;
  clientName: string;
  projectService: string;
  description: string | null;
  amount: string;
  currency: string;
  dueDate: string | null;
  status: InvoiceStatus;
  overdue: boolean;
  paidAt: string | null;
  createdAt: string;
};
