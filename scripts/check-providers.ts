import { db } from "../src/lib/db";

async function main() {
  const providers = await (db as any).paymentProvider.findMany();
  console.log("Payment providers:", JSON.stringify(providers, null, 2));
  const admins = await (db as any).adminUser.findMany({ select: { email: true, role: true } });
  console.log("Admins:", JSON.stringify(admins));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => process.exit(0));
