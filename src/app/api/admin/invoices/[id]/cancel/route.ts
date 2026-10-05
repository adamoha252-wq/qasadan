import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, notFound } from "@/lib/admin/crud-helpers";
import { findInvoiceById, toInvoiceAdminView } from "@/lib/payments/invoices";
import { invoiceActionPolicy } from "@/lib/payments/invoice-types";

type Params = { params: Promise<{ id: string }> };

/**
 * Cancel invoice (Phase 2) — the only manual status change an admin can make.
 * Allowed from PENDING only; the payment flow (Phase 4) owns every other
 * transition (PROCESSING → PAID / FAILED, refunds, expiry).
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await findInvoiceById(id);
      if (!row) return notFound("Invoice");

      if (!invoiceActionPolicy.canCancel(row.status)) {
        return NextResponse.json(
          { error: "Only pending invoices can be cancelled." },
          { status: 409 }
        );
      }

      const updated = await db.invoice.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json({
        invoice: toInvoiceAdminView(updated, request.nextUrl.origin),
      });
    },
    { roles: ["ADMIN"] }
  );
}
