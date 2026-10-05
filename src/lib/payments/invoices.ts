import "server-only";

/**
 * Server-side invoice helpers: secure token + invoice-number generation,
 * lookup by token and the two serialization views (admin / public).
 *
 * Security notes:
 *  - The payment-link token is 192-bit crypto-random (base64url, 32 chars).
 *    Knowing the token IS the authorization to view the invoice — same model
 *    as Stripe payment links. Tokens are only exposed through ADMIN-gated
 *    APIs and the /pay/<token> URL itself, never in listings or sitemaps.
 *  - The public view (toInvoiceClientView) deliberately omits the internal
 *    id, the client email and the token — the /pay page needs none of them.
 */

import crypto from "node:crypto";
import { db } from "@/lib/db";
import { listProviderDefinitions } from "./registry";
import {
  isInvoiceOverdue,
  isInvoiceStatus,
  type InvoiceAdminView,
  type InvoiceClientView,
  type InvoiceStatus,
} from "./invoice-types";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  token: string;
  clientName: string;
  clientEmail: string | null;
  projectService: string;
  description: string | null;
  /** Prisma Decimal — structural type keeps this provider-agnostic. */
  amount: { toFixed: (digits: number) => string };
  currency: string;
  dueDate: Date | null;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** 192-bit random, URL-safe (base64url) — ~32 characters, no padding. */
export function generateInvoiceToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Sequential human-readable number: INV-2026-0001, INV-2026-0002, … */
export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const rows = await db.invoice.findMany({
    where: { invoiceNumber: { startsWith: prefix } },
    select: { invoiceNumber: true },
  });
  let max = 0;
  for (const row of rows) {
    const n = Number.parseInt(row.invoiceNumber.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/** Currency codes accepted for invoices — union of implemented providers. */
export function supportedInvoiceCurrencies(): string[] {
  const codes = new Set<string>();
  for (const def of listProviderDefinitions()) {
    if (!def.implemented) continue;
    for (const c of def.currencies) codes.add(c.code);
  }
  return [...codes].sort();
}

export function isSupportedInvoiceCurrency(code: string): boolean {
  return supportedInvoiceCurrencies().includes(code.toUpperCase());
}

export function invoicePaymentLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/pay/${token}`;
}

export async function findInvoiceByToken(token: string) {
  return db.invoice.findUnique({ where: { token } });
}

/**
 * PRIVACY-SAFE lookup for the public /pay page.
 *
 * React's dev-time async tracing serializes the resolved value of every
 * awaited *named user function* into the RSC flight stream (chunk type "J").
 * For that reason:
 *  - the Prisma query is awaited INLINE here (prisma's internal promise is
 *    not traced, per dev-stream inspection), and
 *  - this function returns only the sanitized client view — never the raw
 *    row (which carries id, clientEmail and token).
 * Any refactor must keep the raw row out of the resolution value of traced
 * userland awaits during RSC rendering.
 */
export async function findInvoiceClientViewByToken(
  token: string
): Promise<InvoiceClientView | null> {
  const row = await db.invoice.findUnique({ where: { token } });
  return row ? toInvoiceClientView(row) : null;
}

export async function findInvoiceById(id: string) {
  return db.invoice.findUnique({ where: { id } });
}

function asStatus(status: string): InvoiceStatus {
  return isInvoiceStatus(status) ? status : "PENDING";
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/** ADMIN area representation (includes token + absolute payment link). */
export function toInvoiceAdminView(row: InvoiceRow, origin: string): InvoiceAdminView {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    token: row.token,
    paymentLink: invoicePaymentLink(origin, row.token),
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    projectService: row.projectService,
    description: row.description,
    amount: row.amount.toFixed(2),
    currency: row.currency,
    dueDate: isoOrNull(row.dueDate),
    status: asStatus(row.status),
    overdue: isInvoiceOverdue(row.status, row.dueDate),
    paidAt: isoOrNull(row.paidAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** PUBLIC /pay page representation — no id, no email, no token echo. */
export function toInvoiceClientView(row: InvoiceRow): InvoiceClientView {
  return {
    invoiceNumber: row.invoiceNumber,
    clientName: row.clientName,
    projectService: row.projectService,
    description: row.description,
    amount: row.amount.toFixed(2),
    currency: row.currency,
    dueDate: isoOrNull(row.dueDate),
    status: asStatus(row.status),
    overdue: isInvoiceOverdue(row.status, row.dueDate),
    paidAt: isoOrNull(row.paidAt),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Normalizes a validated input's dueDate string to a Date (or undefined). */
export function parseDueDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
