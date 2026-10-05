// Phase 1 security + E2E verification via API (server-side session)
import { db } from "../src/lib/db";

const BASE = "http://127.0.0.1:3000";

async function main() {
  // 1) Login to get session cookie
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@qasadan.com", password: "QasadanAdmin2026!" }),
  });
  const cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";
  console.log("login:", loginRes.status, cookie ? "session ok" : "NO COOKIE");

  // 2) List providers — verify NO raw secrets in response
  const listRes = await fetch(`${BASE}/api/admin/payment-providers`, { headers: { cookie } });
  const listBody = await listRes.text();
  console.log("list providers:", listRes.status);
  const raw = JSON.parse(listBody);
  const blob = JSON.stringify(raw);
  const secretPatterns = ["MQ1234567", "ST1234567", "AU1234567", "hppKey", "apiKey", "v1:"];
  const leaks = secretPatterns.filter((p) => blob.includes(p));
  console.log("secret leak check:", leaks.length === 0 ? "CLEAN — no raw secrets in API response" : `LEAKED: ${leaks}`);

  // 3) Unauthenticated access must be denied
  const noAuth = await fetch(`${BASE}/api/admin/payment-providers`);
  console.log("unauthenticated list:", noAuth.status, "(expect 401)");

  const noAuthTest = await fetch(`${BASE}/api/admin/payment-providers/cmuus5d200004it5ktg5mxeav/test`, { method: "POST" });
  console.log("unauthenticated test:", noAuthTest.status, "(expect 401)");

  // 4) DB stores only ciphertext
  const prov = await (db as any).paymentProvider.findFirst();
  const credBlob = prov?.credentials ?? "";
  console.log("DB credential blob starts with:", credBlob.slice(0, 12), "(expect 'v1:' ciphertext prefix)");
  console.log("DB blob contains plaintext?", credBlob.includes("MQ1234567") ? "YES - BAD" : "NO — encrypted only");

  // 5) All public + admin pages 200
  const pages = ["/", "/about", "/who-we-are", "/services", "/portfolio", "/news", "/contact", "/admin/login", "/admin/settings", "/admin/settings/payment-providers"];
  for (const p of pages) {
    const r = await fetch(`${BASE}${p}`, { headers: { cookie }, redirect: "manual" });
    console.log(`page ${p}:`, r.status);
  }

  // 6) Test connection endpoint (live WAAFI sandbox call with dummy creds)
  const testRes = await fetch(`${BASE}/api/admin/payment-providers/cmuus5d200004it5ktg5mxeav/test`, { method: "POST", headers: { cookie } });
  const testBody = await testRes.json();
  console.log("test connection:", testRes.status, JSON.stringify(testBody).slice(0, 200));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => process.exit(0));
