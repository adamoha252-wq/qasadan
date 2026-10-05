/**
 * Phase 3 E2E helper — inspect invoice + payment-attempt state directly in
 * the local sqlite DB (bypasses the API so tests can assert ground truth).
 *
 * Usage:
 *   bun scripts/pay-phase3-db.ts invoice <token>       → invoice status + attempts
 *   bun scripts/pay-phase3-db.ts attempt <referenceId>  → one attempt row
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const [, , cmd, arg] = process.argv;

async function main() {
  if (cmd === "invoice" && arg) {
    const invoice = await db.invoice.findUnique({
      where: { token: arg },
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
        attempts: invoice.payments.map((p) => ({
          referenceId: p.referenceId,
          status: p.status,
          method: p.paymentMethod,
          provider: p.providerCode,
          amount: p.amount.toString(),
          currency: p.currency,
          hasHppUrl: Boolean(p.hppUrl),
          orderId: p.orderId,
          failureReason: p.failureReason ? String(p.failureReason).slice(0, 80) : null,
          callbackData: p.callbackData ? String(p.callbackData).slice(0, 120) : null,
        })),
      })
    );
  } else if (cmd === "attempt" && arg) {
    const attempt = await db.payment.findUnique({ where: { referenceId: arg } });
    if (!attempt) {
      console.log(JSON.stringify({ error: "not-found" }));
      return;
    }
    console.log(
      JSON.stringify({
        referenceId: attempt.referenceId,
        status: attempt.status,
        method: attempt.paymentMethod,
        hasHppUrl: Boolean(attempt.hppUrl),
        orderId: attempt.orderId,
        failureReason: attempt.failureReason ? String(attempt.failureReason).slice(0, 80) : null,
        callbackData: attempt.callbackData ? String(attempt.callbackData).slice(0, 120) : null,
      })
    );
  } else {
    console.log(JSON.stringify({ error: "usage: invoice <token> | attempt <ref>" }));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
