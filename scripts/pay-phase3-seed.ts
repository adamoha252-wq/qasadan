/**
 * Phase 3 E2E helper — simulates a SUCCESSFUL provider initiation for the
 * idempotency / resume / callback tests (the real WAAFI sandbox rejects our
 * dummy credentials, so a successful INITIATED attempt is seeded directly).
 *
 * Sets: invoice → PROCESSING, attempt → INITIATED with the given hppUrl.
 *
 * Usage: bun scripts/pay-phase3-seed.ts <token> <referenceId> <hppUrl>
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const [, , token, referenceId, hppUrl] = process.argv;

async function main() {
  if (!token || !referenceId || !hppUrl) {
    console.log(JSON.stringify({ error: "usage: seed <token> <referenceId> <hppUrl>" }));
    process.exit(1);
  }
  const invoice = await db.invoice.findUnique({ where: { token } });
  if (!invoice) {
    console.log(JSON.stringify({ error: "invoice-not-found" }));
    process.exit(1);
  }
  const provider = await db.paymentProvider.findFirst({ where: { code: "waafipay" } });

  await db.invoice.update({
    where: { id: invoice.id },
    data: { status: "PROCESSING" },
  });
  const attempt = await db.payment.create({
    data: {
      invoiceId: invoice.id,
      providerId: provider?.id ?? "seeded",
      providerCode: "waafipay",
      providerName: "WAAFI Pay",
      paymentMethod: "MWALLET_ACCOUNT",
      amount: invoice.amount,
      currency: invoice.currency,
      status: "INITIATED",
      referenceId,
      hppUrl,
      orderId: "seeded-order",
    },
  });
  console.log(
    JSON.stringify({ ok: true, attemptId: attempt.id, referenceId: attempt.referenceId })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
