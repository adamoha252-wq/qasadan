import { db } from "../src/lib/db";
async function main() {
  const team = await (db as any).teamMember.findMany({ select: { name: true, role: true, imageUrl: true } });
  console.log(JSON.stringify(team, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => process.exit(0));
