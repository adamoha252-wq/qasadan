/**
 * Inspect local DB state for the plan-checkout feature:
 * which pricing plans exist (id/name/price/active) and whether WAAFI Pay
 * is activated with credentials + methods + USD currency (so the /pay page
 * will show the mobile wallet selection).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const plans = await db.pricingPlan.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true, price: true, period: true, isActive: true, isFeatured: true },
  });
  console.log("=== PRICING PLANS ===");
  for (const p of plans) {
    console.log(
      `${p.isActive ? "[ACTIVE]" : "[off]  "} ${p.name} | price="${p.price}" | ${p.period} | featured=${p.isFeatured} | id=${p.id}`
    );
  }

  const providers = await db.paymentProvider.findMany({
    select: { code: true, isActive: true, isSandbox: true, methods: true, currencies: true, credentials: true, lastTestOutcome: true },
  });
  console.log("\n=== PAYMENT PROVIDERS ===");
  for (const p of providers) {
    const hasCreds = p.credentials.length > 0;
    console.log(
      `${p.code} | active=${p.isActive} | sandbox=${p.isSandbox} | creds=${hasCreds ? "set" : "EMPTY"} | methods=${p.methods} | currencies=${p.currencies} | lastTest=${p.lastTestOutcome ?? "never"}`
    );
  }

  const invoiceCount = await db.invoice.count();
  console.log(`\ninvoices total: ${invoiceCount}`);
  const last = await db.invoice.findFirst({ orderBy: { createdAt: "desc" }, select: { invoiceNumber: true, status: true, projectService: true } });
  console.log("latest invoice:", JSON.stringify(last));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
