/**
 * Post-E2E DB check + cleanup:
 *  - verify the plan-order invoices were created correctly (number sequence,
 *    PENDING status, server-parsed amount 150.00 USD, projectService)
 *  - delete the "Rate Check" spam orders, KEEP the Amina demo order
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const orders = await db.invoice.findMany({
    where: { projectService: "Starter Plan" },
    orderBy: { createdAt: "asc" },
  });
  console.log("=== PLAN ORDER INVOICES ===");
  for (const o of orders) {
    console.log(
      `${o.invoiceNumber} | ${o.status} | ${o.amount.toFixed(2)} ${o.currency} | ${o.clientName} | ${o.projectService} | ${o.description ?? ""}`
    );
  }

  const del = await db.invoice.deleteMany({
    where: { clientName: { startsWith: "Rate Check" } },
  });
  console.log(`\ndeleted rate-check spam orders: ${del.count}`);

  const keep = await db.invoice.findFirst({
    where: { clientName: "Amina Hassan" },
    orderBy: { createdAt: "desc" },
  });
  console.log(
    "kept demo order:",
    keep ? `${keep.invoiceNumber} (${keep.status}, ${keep.amount.toFixed(2)} ${keep.currency})` : "none"
  );
  console.log(
    "payment link:",
    keep ? `/pay/${keep.token}` : "-"
  );

  const total = await db.invoice.count();
  console.log("invoices total now:", total);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
