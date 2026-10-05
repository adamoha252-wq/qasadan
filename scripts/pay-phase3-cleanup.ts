/**
 * Phase 3 E2E cleanup — resets the demo invoice to a pristine PENDING state
 * (deletes all payment attempts) after the test run, so the user sees a
 * clean checkout in the preview.
 *
 * Usage: bun scripts/pay-phase3-cleanup.ts <token>
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const [, , token] = process.argv;

async function main() {
  if (!token) {
    console.log(JSON.stringify({ error: "usage: cleanup <token>" }));
    process.exit(1);
  }
  const invoice = await db.invoice.findUnique({ where: { token } });
  if (!invoice) {
    console.log(JSON.stringify({ error: "invoice-not-found" }));
    process.exit(1);
  }
  await db.payment.deleteMany({ where: { invoiceId: invoice.id } });
  await db.invoice.update({ where: { id: invoice.id }, data: { status: "PENDING" } });
  console.log(JSON.stringify({ ok: true, invoiceNumber: invoice.invoiceNumber }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
