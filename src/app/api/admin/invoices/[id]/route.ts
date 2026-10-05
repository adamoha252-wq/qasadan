import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { updateInvoiceSchema } from "@/lib/payments/schemas";
import {
  findInvoiceById,
  isSupportedInvoiceCurrency,
  parseDueDate,
  toInvoiceAdminView,
} from "@/lib/payments/invoices";
import { invoiceActionPolicy } from "@/lib/payments/invoice-types";

type Params = { params: Promise<{ id: string }> };

/**
 * Single invoice management (Phase 2).
 * EDIT: only while PENDING (money records are immutable history afterwards).
 * DELETE: only while PENDING / CANCELLED / EXPIRED / FAILED.
 */

export async function GET(request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await findInvoiceById(id);
      if (!row) return notFound("Invoice");
      return NextResponse.json({
        invoice: toInvoiceAdminView(row, request.nextUrl.origin),
      });
    },
    { roles: ["ADMIN"] }
  );
}

export async function PUT(request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await findInvoiceById(id);
      if (!row) return notFound("Invoice");

      if (!invoiceActionPolicy.canEdit(row.status)) {
        return NextResponse.json(
          { error: "Only pending invoices can be edited." },
          { status: 409 }
        );
      }

      const parsed = await parseBody(request, updateInvoiceSchema);
      if ("error" in parsed) return parsed.error;
      const input = parsed.data;

      if (input.currency !== undefined && !isSupportedInvoiceCurrency(input.currency)) {
        return NextResponse.json(
          {
            error: `Currency ${input.currency} is not supported by any configured payment provider.`,
          },
          { status: 400 }
        );
      }

      const updated = await db.invoice.update({
        where: { id },
        data: {
          ...(input.clientName !== undefined ? { clientName: input.clientName } : {}),
          ...(input.clientEmail !== undefined
            ? { clientEmail: input.clientEmail.trim() ? input.clientEmail.trim() : null }
            : {}),
          ...(input.projectService !== undefined ? { projectService: input.projectService } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() ? input.description.trim() : null }
            : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: parseDueDate(input.dueDate) ?? null }
            : {}),
        },
      });

      return NextResponse.json({
        invoice: toInvoiceAdminView(updated, request.nextUrl.origin),
      });
    },
    { roles: ["ADMIN"] }
  );
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await findInvoiceById(id);
      if (!row) return notFound("Invoice");

      if (!invoiceActionPolicy.canDelete(row.status)) {
        return NextResponse.json(
          { error: "Paid, processing or refunded invoices cannot be deleted." },
          { status: 409 }
        );
      }

      await db.invoice.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    },
    { roles: ["ADMIN"] }
  );
}
