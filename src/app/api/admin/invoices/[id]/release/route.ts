import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/admin/crud-helpers";
import { toInvoiceAdminView } from "@/lib/payments/invoices";

/**
 * ADMIN recovery tool for stuck invoices (Phase 4 support, spec §6).
 *
 *   POST /api/admin/invoices/[id]/release
 *
 * A PROCESSING invoice whose attempt can no longer conclude (provider
 * outage, lost callbacks) would block both a retry AND admin actions
 * forever. This endpoint releases the invoice back to PENDING — allowed
 * ONLY when NO verified (SUCCEEDED) payment exists for it, so a genuinely
 * paid invoice can never be flipped back. All open attempts are recorded
 * as FAILED with an audit reason before the release.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const invoice = await db.invoice.findUnique({
        where: { id },
        include: { payments: true },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      }
      if (invoice.status !== "PROCESSING") {
        return NextResponse.json(
          { error: "Only invoices stuck in Processing can be released." },
          { status: 409 }
        );
      }

      // Safety net: never release an invoice that has a verified payment.
      const succeeded = invoice.payments.find((p) => p.status === "SUCCEEDED");
      if (succeeded) {
        return NextResponse.json(
          { error: "This invoice has a verified payment — it cannot be released." },
          { status: 409 }
        );
      }

      // Close all open attempts with an audit reason, then release.
      await db.payment.updateMany({
        where: {
          invoiceId: invoice.id,
          status: { in: ["INITIATING", "INITIATED", "CALLBACK_SUCCESS"] },
        },
        data: {
          status: "FAILED",
          failureReason: "Released by an administrator — the payment session could not conclude.",
        },
      });
      const released = await db.invoice.updateMany({
        where: { id: invoice.id, status: "PROCESSING" },
        data: { status: "PENDING" },
      });
      if (released.count === 0) {
        return NextResponse.json(
          { error: "The invoice changed state — refresh and try again." },
          { status: 409 }
        );
      }

      const fresh = await db.invoice.findUnique({ where: { id } });
      return NextResponse.json(
        { invoice: fresh ? toInvoiceAdminView(fresh, request.nextUrl.origin) : null },
        { status: 200 }
      );
    },
    { roles: ["ADMIN"] }
  );
}
