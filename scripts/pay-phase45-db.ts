/**
 * Phase 4/5 E2E helper — inspect + manage invoice/payment state directly in
 * the local sqlite DB (bypasses the API so tests can assert ground truth),
 * plus cleanup of the E2E test fixtures.
 *
 * Usage:
 *   bun scripts/pay-phase45-db.ts state <invoiceNumber>
 *   bun scripts/pay-phase45-db.ts attempt <referenceId>
 *   bun scripts/pay-phase45-db.ts count-succeeded <invoiceNumber>
 *   bun scripts/pay-phase45-db.ts cleanup          → remove Phase45 fixtures
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const [, , cmd, arg] = process.argv;

const FIXTURE_MARKER = "Phase45 E2E";

async function main() {
  if (cmd === "state" && arg) {
    const invoice = await db.invoice.findUnique({
      where: { invoiceNumber: arg },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
    if (!invoice) {
      console.log(JSON.stringify({ error: "not-found" }));
      return;
    }
    console.log(
      JSON.stringify({
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
        token: invoice.token,
        attempts: invoice.payments.map((p) => ({
          referenceId: p.referenceId,
          status: p.status,
          providerTxnId: p.providerTxnId,
          payerAccount: p.payerAccount,
          verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
          hasVerificationData: Boolean(p.verificationData),
          failureReason: p.failureReason,
          amount: p.amount.toFixed(2),
          currency: p.currency,
        })),
      })
    );
    return;
  }

  if (cmd === "attempt" && arg) {
    const attempt = await db.payment.findUnique({ where: { referenceId: arg } });
    if (!attempt) {
      console.log(JSON.stringify({ error: "not-found" }));
      return;
    }
    console.log(
      JSON.stringify({
        referenceId: attempt.referenceId,
        status: attempt.status,
        providerTxnId: attempt.providerTxnId,
        verifiedAt: attempt.verifiedAt ? attempt.verifiedAt.toISOString() : null,
        failureReason: attempt.failureReason,
      })
    );
    return;
  }

  if (cmd === "count-succeeded" && arg) {
    const count = await db.payment.count({
      where: { invoice: { invoiceNumber: arg }, status: "SUCCEEDED" },
    });
    console.log(JSON.stringify({ succeeded: count }));
    return;
  }

  if (cmd === "cleanup") {
    // Remove all E2E fixtures (invoices cascade-delete their payments).
    const deleted = await db.invoice.deleteMany({
      where: { clientName: { contains: FIXTURE_MARKER } },
    });
    console.log(JSON.stringify({ deletedInvoices: deleted.count }));
    return;
  }

  console.log("unknown command");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
