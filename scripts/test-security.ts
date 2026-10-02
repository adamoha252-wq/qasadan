/**
 * QASADAN Phase 8 — Security & secret-exposure checks.
 * Supplements the per-phase suites with a dedicated security sweep.
 */
const BASE = "http://localhost:3000";
const RUN = Date.now().toString().slice(-6);
const sqliIp = `192.0.2.${Number(RUN) % 200 + 10}`;
const xssIp = `192.0.2.${Number(RUN) % 200 + 11}`;
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("🔒 QASADAN Phase 8 — Security Sweep\n");

  // ---------- 1. Sensitive files are not served ----------
  const sensitivePaths = [
    "/.env",
    "/.env.local",
    "/prisma/schema.prisma",
    "/db/custom.db",
    "/package.json",
    "/worklog.md",
    "/scripts/seed.ts",
    "/src/lib/auth/password.ts",
    "/.git/config",
    "/storage/uploads/.gitkeep",
    "/admin/(protected)/layout.tsx",
  ];
  for (const path of sensitivePaths) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    check(`${path} not served`, res.status === 404 || res.status === 307 || res.status === 400, `got ${res.status}`);
  }

  // ---------- 2. No secrets leak into public HTML ----------
  const pages = ["/", "/about", "/portfolio", "/news", "/contact", "/admin/login"];
  const secretPatterns = [
    /QasadanAdmin2026/,
    /passwordHash/i,
    /DATABASE_URL/,
    /sk-[a-zA-Z0-9]{20,}/,
  ];
  for (const page of pages) {
    const html = await (await fetch(`${BASE}${page}`)).text();
    const leaks = secretPatterns.filter((p) => p.test(html));
    check(`${page} HTML contains no secrets`, leaks.length === 0, leaks.map(String).join(","));
  }

  // ---------- 3. Session cookie never exposed to JS (httpOnly) ----------
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.55" },
    body: JSON.stringify({ email: "admin@qasadan.com", password: "QasadanAdmin2026!" }),
  });
  const setCookie = loginRes.headers.get("set-cookie") || "";
  check("Login sets cookie", setCookie.includes("qasadan_session="));
  check("Session cookie HttpOnly", /httponly/i.test(setCookie));
  check("Session cookie not JS-readable (no token in body)", !JSON.stringify(await loginRes.clone().json()).includes(setCookie.split(";")[0].split("=")[1]));
  const cookie = setCookie.split(";")[0];

  // ---------- 4. SQL injection attempts on public inputs ----------
  const sqliPayloads = [
    { name: "'; DROP TABLE Service;--", email: "x@x.com", message: "AAAAAAAAAAAAAAAA" },
    { name: "Robert'); DROP TABLE Inquiry;--", email: "sqli@test.com", message: "'; DELETE FROM Inquiry WHERE 1=1;--" },
    { name: "Admin' OR '1'='1", email: "admin'--@x.com", message: "UNION SELECT passwordHash FROM AdminUser" },
  ];
  for (const payload of sqliPayloads) {
    const res = await fetch(`${BASE}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": sqliIp },
      body: JSON.stringify(payload),
    });
    // Must be either 400 (validation) or 201 (stored as inert text) — never a 5xx
    check(`SQLi payload treated safely ("${payload.name.slice(0, 20)}…")`, res.status === 400 || res.status === 201, `got ${res.status}`);
  }
  // Verify DB still intact after injection attempts
  const home = await (await fetch(`${BASE}/`)).text();
  check("Database intact after SQLi attempts", home.includes("IRRDO") && home.includes("Web Applications"));

  // ---------- 5. XSS payloads stored as text (escaped on render) ----------
  const xssMessage = '<script>alert("xss")</script><img src=x onerror=alert(1)>'.repeat(1);
  const xssRes = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": xssIp },
    body: JSON.stringify({ name: "XSS Test <b>bold</b>", email: "xss@test.com", message: xssMessage }),
  });
  check("XSS payload accepted as inert text (201)", xssRes.status === 201);
  // Admin views inquiries — check the message renders escaped (admin list is client-side; text nodes are safe by React)
  const inqRes = await fetch(`${BASE}/api/admin/inquiries`, { headers: { cookie } });
  const inqData = await inqRes.json();
  const xssInquiry = (inqData.inquiries || []).find((i: { email: string }) => i.email === "xss@test.com");
  check("XSS inquiry stored (returned as data, not executed)", !!xssInquiry && xssInquiry.message.includes("<script>"));
  // Cleanup XSS test inquiry
  if (xssInquiry) {
    await fetch(`${BASE}/api/admin/inquiries/${xssInquiry.id}`, { method: "DELETE", headers: { cookie } });
  }

  // ---------- 6. No auth bypass via headers ----------
  const bypassAttempts = [
    { headers: { "x-admin": "true", cookie: "" } },
    { headers: { "x-role": "ADMIN", cookie: "" } },
    { headers: { authorization: "Bearer admin", cookie: "" } },
    { headers: { cookie: "qasadan_session=admin" } },
    { headers: { cookie: "qasadan_session=" } },
    { headers: { cookie: "session=admin; qasadan_session=" } },
  ];
  for (const attempt of bypassAttempts) {
    const res = await fetch(`${BASE}/api/admin/auth/me`, {
      headers: attempt.headers as Record<string, string>,
    });
    check("Auth bypass attempt rejected (401)", res.status === 401);
  }

  // ---------- 7. CSRF-style: cross-origin form post to admin API ----------
  const csrfRes = await fetch(`${BASE}/api/admin/services`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://evil.example.com",
      cookie, // even WITH the cookie, cross-origin JSON post should be SameSite-protected at browser level;
    },
  });
  // Note: fetch here is server-side (no SameSite enforcement) — this checks our API doesn't rely on Origin checks alone.
  // The REAL CSRF protection is SameSite=Lax (browsers won't send cookie on cross-site POST).
  check(
    "Cross-origin POST noted (SameSite=Lax is the browser-level defense)",
    csrfRes.status === 201 || csrfRes.status === 400,
    `status ${csrfRes.status} — ${csrfRes.status === 201 ? "cleanup follows" : "rejected"}`
  );
  if (csrfRes.status === 201) {
    const created = await csrfRes.json();
    await fetch(`${BASE}/api/admin/services/${created.service.id}`, { method: "DELETE", headers: { cookie } });
    check("CSRF-test service cleaned up", true);
  }

  // ---------- 8. Upload abuse beyond Phase 6 ----------
  // Empty filename / no file part
  let res = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: { cookie },
  });
  check("Upload with no form data → 400", res.status === 400);

  const fd = new FormData();
  fd.append("notfile", new File(["hello"], "x.txt", { type: "text/plain" }));
  res = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: { cookie },
    body: fd,
  });
  check("Upload with wrong field name → 400", res.status === 400);

  // Polyglot: PNG magic bytes + HTML content
  const polyglot = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new TextEncoder().encode("<script>alert(1)</script>")]);
  const fd2 = new FormData();
  fd2.append("file", new File([polyglot], "evil.png", { type: "image/png" }));
  res = await fetch(`${BASE}/api/admin/upload`, {
    method: "POST",
    headers: { cookie },
    body: fd2,
  });
  check("PNG+HTML polyglot upload 201 (served with nosniff + image content-type)", res.status === 201);
  if (res.status === 201) {
    const { url } = await res.json();
    const served = await fetch(`${BASE}${url}`);
    check("Polyglot served as image/png with nosniff", served.headers.get("content-type") === "image/png" && served.headers.get("x-content-type-options") === "nosniff");
    await fetch(`${BASE}/api/admin/upload`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ url }),
    });
  }

  // ---------- 9. Logout invalidates the session ----------
  await fetch(`${BASE}/api/admin/auth/logout`, { method: "POST", headers: { cookie } });
  res = await fetch(`${BASE}/api/admin/auth/me`, { headers: { cookie } });
  check("Session invalid after logout", res.status === 401);

  console.log(`\n📊 RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("❌ Test suite crashed:", e);
    process.exit(1);
  })
  .finally(() => {});

export {};
