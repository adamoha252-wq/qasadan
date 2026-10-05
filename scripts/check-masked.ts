const BASE = "http://127.0.0.1:3000";
async function main() {
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@qasadan.com", password: "QasadanAdmin2026!" }),
  });
  const cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";
  const listRes = await fetch(`${BASE}/api/admin/payment-providers`, { headers: { cookie } });
  const data = await listRes.json();
  const prov = (data.providers ?? [])[0];
  console.log("credentials object returned to the browser:");
  console.log(JSON.stringify(prov?.credentials, null, 2));
  console.log("\nraw secret values present?",
    JSON.stringify(prov).includes("sk_test") || /"value"\s*:\s*"[A-Za-z0-9]{20,}/.test(JSON.stringify(prov))
      ? "YES — BAD" : "NO — only masked previews / non-secret IDs");
}
main().catch(e => { console.error(e); process.exit(1); });
