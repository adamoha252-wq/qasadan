import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/admin/crud-helpers";
import { paymentMethodLabel } from "@/lib/payments/verification";
import {
  PAYMENT_ATTEMPT_STATUSES,
  type PaymentAdminView,
} from "@/lib/payments/payment-types";

/**
 * Admin payment history (Phase 5, spec §8).
 *
 *   GET /api/admin/payments?q=&status=&provider=
 *
 * ADMIN-only. Every hosted-checkout attempt (successful or not) with its
 * invoice context: invoice number, client, provider, payment method,
 * amount, reference + transaction ids, status, dates. Search + filtering
 * are done in JS after a capped fetch — provider-agnostic (works
 * identically on sqlite preview and postgres prod), matching the invoices
 * API pattern.
 */

const MAX_ROWS = 500;

export async function GET(request: NextRequest) {
  return withAdmin(
    async () => {
      const { searchParams } = request.nextUrl;
      const q = (searchParams.get("q") ?? "").trim().toLowerCase();
      const status = searchParams.get("status") ?? "ALL";
      const provider = searchParams.get("provider") ?? "ALL";

      const where: { status?: string; providerCode?: string } = {};
      if (status !== "ALL" && (PAYMENT_ATTEMPT_STATUSES as readonly string[]).includes(status)) {
        where.status = status;
      }
      if (provider !== "ALL") where.providerCode = provider;

      const rows = await db.payment.findMany({
        where,
        include: {
          invoice: {
            select: { id: true, invoiceNumber: true, clientName: true, token: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });

      const views = rows.map((row): PaymentAdminView => ({
        id: row.id,
        invoiceId: row.invoice.id,
        invoiceNumber: row.invoice.invoiceNumber,
        invoiceStatus: row.invoice.status,
        clientName: row.invoice.clientName,
        providerCode: row.providerCode,
        providerName: row.providerName,
        paymentMethod: row.paymentMethod,
        methodLabel: paymentMethodLabel(row.providerCode, row.paymentMethod),
        amount: row.amount.toFixed(2),
        currency: row.currency,
        status: row.status,
        referenceId: row.referenceId,
        orderId: row.orderId,
        providerTxnId: row.providerTxnId,
        payerAccount: row.payerAccount,
        failureReason: row.failureReason,
        hasCallbackData: Boolean(row.callbackData),
        verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        receiptUrl:
          row.status === "SUCCEEDED" && row.invoice.status === "PAID"
            ? `/api/pay/${row.invoice.token}/receipt`
            : null,
        paymentPageUrl: `/pay/${row.invoice.token}`,
      }));

      const filtered = q
        ? views.filter((v) =>
            [
              v.invoiceNumber,
              v.clientName,
              v.providerName,
              v.methodLabel,
              v.referenceId,
              v.providerTxnId ?? "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
          )
        : views;

      return NextResponse.json({ payments: filtered });
    },
    { roles: ["ADMIN"] }
  );
}
