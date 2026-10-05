import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody } from "@/lib/admin/crud-helpers";
import { createInvoiceSchema } from "@/lib/payments/schemas";
import {
  findInvoiceByToken,
  generateInvoiceToken,
  isSupportedInvoiceCurrency,
  nextInvoiceNumber,
  parseDueDate,
  toInvoiceAdminView,
} from "@/lib/payments/invoices";
import { INVOICE_STATUSES } from "@/lib/payments/invoice-types";

/**
 * Invoice management (Phase 2).
 * ADMIN-only. Creating an invoice generates the secure /pay/<token> link.
 *
 * Search (q) and status filtering are done in JS after a capped fetch —
 * provider-agnostic (works identically on sqlite preview and postgres prod)
 * and the dataset (agency invoices) is small.
 */

const MAX_ROWS = 500;

export async function GET(request: NextRequest) {
  return withAdmin(
    async () => {
      const { searchParams } = request.nextUrl;
      const q = (searchParams.get("q") ?? "").trim().toLowerCase();
      const status = searchParams.get("status") ?? "ALL";

      const where =
        status !== "ALL" && (INVOICE_STATUSES as readonly string[]).includes(status)
          ? { status }
          : {};

      const rows = await db.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
      });

      const filtered = q
        ? rows.filter((row) =>
            [
              row.invoiceNumber,
              row.clientName,
              row.clientEmail ?? "",
              row.projectService,
            ]
              .join(" ")
              .toLowerCase()
              .includes(q)
          )
        : rows;

      return NextResponse.json({
        invoices: filtered.map((row) => toInvoiceAdminView(row, request.nextUrl.origin)),
      });
    },
    { roles: ["ADMIN"] }
  );
}

export async function POST(request: NextRequest) {
  return withAdmin(
    async () => {
      const parsed = await parseBody(request, createInvoiceSchema);
      if ("error" in parsed) return parsed.error;
      const input = parsed.data;

      if (!isSupportedInvoiceCurrency(input.currency)) {
        return NextResponse.json(
          {
            error: `Currency ${input.currency} is not supported by any configured payment provider.`,
          },
          { status: 400 }
        );
      }

      // Unique-constraint safe creation (token / invoice number races):
      // retry with fresh values up to 3 times.
      for (let attempt = 0; attempt < 3; attempt++) {
        const [invoiceNumber, token] = await Promise.all([
          nextInvoiceNumber(),
          generateInvoiceToken(),
        ]);
        // Token must not already exist (astronomically unlikely, but free to check).
        if (await findInvoiceByToken(token)) continue;

        try {
          const row = await db.invoice.create({
            data: {
              invoiceNumber,
              token,
              clientName: input.clientName,
              clientEmail: input.clientEmail?.trim() ? input.clientEmail.trim() : null,
              projectService: input.projectService,
              description: input.description?.trim() ? input.description.trim() : null,
              amount: input.amount,
              currency: input.currency,
              dueDate: parseDueDate(input.dueDate),
              status: "PENDING",
            },
          });
          return NextResponse.json(
            { invoice: toInvoiceAdminView(row, request.nextUrl.origin) },
            { status: 201 }
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("Unique constraint") && attempt < 2) continue;
          throw error;
        }
      }

      return NextResponse.json(
        { error: "Could not allocate a unique invoice number — please retry." },
        { status: 500 }
      );
    },
    { roles: ["ADMIN"] }
  );
}
