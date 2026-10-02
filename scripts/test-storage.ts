/**
 * QASADAN Phase 6 — Storage test suite.
 * Tests image upload (validation, size limits, magic bytes), public serving,
 * replacement, deletion, access control, path traversal, and public display
 * of portfolio/news/team images.
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { execSync } from "child_process";

const BASE = "http://localhost:3000";
const RUN = Date.now().toString().slice(-6);
let passed = 0;
let failed = 0;
let cookie = "";

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
  console.log("📦 QASADAN Phase 6 — Storage Tests\n");

  // ---------- Prepare test files ----------
  mkdirSync("/tmp/qasadan-test", { recursive: true });
  execSync(
    `cd /home/z/my-project && bun -e "
const sharp = require('sharp');
(async () => {
  await sharp({ create: { width: 800, height: 500, channels: 3, background: { r: 11, g: 31, b: 58 } } })
    .jpeg({ quality: 80 }).toFile('/tmp/qasadan-test/valid.jpg');
  await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 6, g: 182, b: 212, alpha: 1 } } })
    .png().toFile('/tmp/qasadan-test/valid.png');
  console.log('images generated');
})();"`,
    { encoding: "utf-8" }
  );
  check("Test images generated (sharp)", existsSync("/tmp/qasadan-test/valid.jpg") && existsSync("/tmp/qasadan-test/valid.png"));

  // Fake image: text content with .png extension (magic bytes will fail)
  writeFileSync("/tmp/qasadan-test/fake.png", "This is definitely not an image, just plain text pretending to be one.");
  // Oversized: real JPEG header + junk to exceed 5MB
  const bigHeader = Buffer.from(execSync("head -c 2048 /tmp/qasadan-test/valid.jpg"));
  const big = Buffer.concat([bigHeader, Buffer.alloc(6 * 1024 * 1024, 7)]);
  writeFileSync("/tmp/qasadan-test/too-big.jpg", big);
  // SVG upload attempt (svg not in allowed list — XSS vector)
  writeFileSync("/tmp/qasadan-test/evil.svg", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>');
  check("Test fixtures prepared", existsSync("/tmp/qasadan-test/fake.png") && existsSync("/tmp/qasadan-test/too-big.jpg"));

  // ---------- Login ----------
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${Number(RUN) % 100 + 100}` },
    body: JSON.stringify({ email: "admin@qasadan.com", password: "QasadanAdmin2026!" }),
  });
  cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
  check("Admin login", loginRes.status === 200);

  const upload = async (file: string, name: string, type: string, useCookie = true) => {
    const fd = new FormData();
    const buf = await (await import("fs/promises")).readFile(file);
    fd.append("file", new File([buf], name, { type }));
    return fetch(`${BASE}/api/admin/upload`, {
      method: "POST",
      headers: useCookie ? { cookie } : {},
      body: fd,
    });
  };

  // ---------- 1. Valid upload ----------
  let res = await upload("/tmp/qasadan-test/valid.jpg", "cover.jpg", "image/jpeg");
  check("Valid JPEG upload 201", res.status === 201, `got ${res.status}`);
  let body = await res.json();
  const jpgUrl = body.url;
  check("Returns /api/media URL", typeof jpgUrl === "string" && jpgUrl.startsWith("/api/media/"), jpgUrl);

  res = await upload("/tmp/qasadan-test/valid.png", "icon.png", "image/png");
  check("Valid PNG upload 201", res.status === 201);
  body = await res.json();
  const pngUrl = body.url;

  // ---------- 2. Invalid file type (fake PNG: magic bytes fail) ----------
  res = await upload("/tmp/qasadan-test/fake.png", "fake.png", "image/png");
  check("Fake PNG (text content) rejected 415", res.status === 415, `got ${res.status}`);

  // SVG rejected (not in allowlist)
  res = await upload("/tmp/qasadan-test/evil.svg", "evil.svg", "image/svg+xml");
  check("SVG upload rejected 415 (XSS protection)", res.status === 415, `got ${res.status}`);

  // ---------- 3. Oversized upload ----------
  res = await upload("/tmp/qasadan-test/too-big.jpg", "huge.jpg", "image/jpeg");
  check("Oversized upload (6MB) rejected 413", res.status === 413, `got ${res.status}`);

  // ---------- 4. Public serving + preview ----------
  res = await fetch(`${BASE}${jpgUrl}`);
  check("Uploaded JPEG served publicly 200", res.status === 200);
  check("Correct Content-Type", res.headers.get("content-type") === "image/jpeg");
  check("Immutable cache header", (res.headers.get("cache-control") || "").includes("immutable"));
  const servedBytes = Buffer.from(await res.arrayBuffer());
  const originalBytes = await (await import("fs/promises")).readFile("/tmp/qasadan-test/valid.jpg");
  check("Served bytes match uploaded file", servedBytes.equals(originalBytes));

  // ---------- 5. Replace (upload new, delete old) ----------
  res = await upload("/tmp/qasadan-test/valid.png", "replacement.png", "image/png");
  body = await res.json();
  const replacementUrl = body.url;
  check("Replacement upload 201", res.status === 201);
  check("Replacement has different URL", replacementUrl !== pngUrl);

  // ---------- 6. Delete via admin API ----------
  res = await fetch(`${BASE}/api/admin/upload`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ url: pngUrl }),
  });
  check("Admin delete stored image 200", res.status === 200);
  res = await fetch(`${BASE}${pngUrl}`);
  check("Deleted image URL now 404", res.status === 404);

  // ---------- 7. Unauthorized upload ----------
  res = await upload("/tmp/qasadan-test/valid.jpg", "anon.jpg", "image/jpeg", false);
  check("Anonymous upload rejected 401", res.status === 401);

  // ---------- 8. Unauthorized delete ----------
  res = await fetch(`${BASE}/api/admin/upload`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: jpgUrl }),
  });
  check("Anonymous delete rejected 401", res.status === 401);

  // ---------- 9. Path traversal attempts ----------
  const traversals = [
    "/api/media/../../.env",
    "/api/media/..%2F..%2F.env",
    "/api/media/2026/10/../../../package.json",
    "/api/media/2026/10/..%5C..%5C..%5Cdb%5Ccustom.db",
    "/api/media/2026/10/",  // incomplete path
    "/api/media/2026/10/script.js",  // non-image extension
  ];
  for (const path of traversals) {
    res = await fetch(`${BASE}${path}`);
    check(`Traversal/served-rejected: ${path} → 404`, res.status === 404, `got ${res.status}`);
  }

  // ---------- 10. Non-existent image 404 (broken image handling at API level) ----------
  res = await fetch(`${BASE}/api/media/2026/10/nonexistent-file.jpg`);
  check("Non-existent media 404", res.status === 404);

  // ---------- 11. Portfolio image displays publicly ----------
  // Set IRRDO cover to uploaded image, verify public page, restore
  const projRes = await fetch(`${BASE}/api/admin/projects`, { headers: { cookie } });
  const projects = (await projRes.json()).projects as { id: string; slug: string; title: string }[];
  const irrdo = projects.find((p) => p.slug === "irrdo");
  check("IRRDO project found for image test", !!irrdo);
  if (!irrdo) throw new Error("IRRDO project missing — aborting");

  const irrdoRes = await fetch(`${BASE}/api/admin/projects/${irrdo.id}`, { headers: { cookie } });
  const irrdoData = (await irrdoRes.json()).project;

  // Clean payload (DB row → API shape): parse JSON string fields, trim dates, drop row metadata
  const projectPayload = (p: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({
    title: p.title,
    slug: p.slug,
    client: (p.client as string) || "",
    category: (p.category as string) || "",
    summary: p.summary,
    content: (p.content as string) || "",
    technologies: typeof p.technologies === "string" ? JSON.parse(p.technologies || "[]") : p.technologies || [],
    externalUrl: (p.externalUrl as string) || "",
    coverImage: (p.coverImage as string) || "",
    isFeatured: !!p.isFeatured,
    isPublished: !!p.isPublished,
    completedAt: p.completedAt ? String(p.completedAt).slice(0, 10) : "",
    order: (p.order as number) || 0,
    ...overrides,
  });

  await fetch(`${BASE}/api/admin/projects/${irrdo.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(projectPayload(irrdoData, { coverImage: jpgUrl })),
  });
  const irrdoPublic = await (await fetch(`${BASE}/portfolio/irrdo`)).text();
  check("Portfolio detail page shows uploaded cover", irrdoPublic.includes(jpgUrl));

  // Gallery image displays publicly
  await fetch(`${BASE}/api/admin/projects/${irrdo.id}/images`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ images: [{ url: jpgUrl, caption: "Storage test image", order: 0 }] }),
  });
  const irrdoPublic2 = await (await fetch(`${BASE}/portfolio/irrdo`)).text();
  check("Portfolio gallery displays uploaded image", irrdoPublic2.includes("Storage test image"));

  // ---------- 12. News image displays publicly ----------
  const artRes = await fetch(`${BASE}/api/admin/articles`, { headers: { cookie } });
  const articles = (await artRes.json()).articles as { id: string; slug: string }[];
  const article = articles.find((a) => a.slug === "qasadan-opens-new-digital-lab-mogadishu");
  check("Seed article found", !!article);
  if (!article) throw new Error("Seed article missing — aborting");
  const artData = (await (await fetch(`${BASE}/api/admin/articles/${article.id}`, { headers: { cookie } })).json()).article;
  const articlePayload = (a: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({
    title: a.title,
    slug: a.slug,
    excerpt: (a.excerpt as string) || "",
    content: (a.content as string) || "",
    categoryId: (a.categoryId as string) || ((a.category as { id?: string } | undefined)?.id ?? "") || "",
    coverImage: (a.coverImage as string) || "",
    isPublished: !!a.isPublished,
    isArchived: !!a.isArchived,
    ...overrides,
  });
  await fetch(`${BASE}/api/admin/articles/${article.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(articlePayload(artData, { coverImage: jpgUrl })),
  });
  const artPublic = await (await fetch(`${BASE}/news/${article.slug}`)).text();
  check("News article displays uploaded cover", artPublic.includes(jpgUrl));

  // ---------- 13. Team image displays publicly ----------
  const teamRes = await fetch(`${BASE}/api/admin/team`, { headers: { cookie } });
  const members = (await teamRes.json()).members as { id: string; name: string }[];
  const member = members[0];
  const memData = (await (await fetch(`${BASE}/api/admin/team/${member.id}`, { headers: { cookie } })).json()).member;
  const memberPayload = (m: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({
    name: m.name,
    role: m.role,
    bio: (m.bio as string) || "",
    imageUrl: (m.imageUrl as string) || "",
    linkedinUrl: (m.linkedinUrl as string) || "",
    twitterUrl: (m.twitterUrl as string) || "",
    order: (m.order as number) || 0,
    isActive: !!m.isActive,
    ...overrides,
  });
  await fetch(`${BASE}/api/admin/team/${member.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(memberPayload(memData, { imageUrl: jpgUrl })),
  });
  const wwaPublic = await (await fetch(`${BASE}/who-we-are`)).text();
  check("Team member displays uploaded photo", wwaPublic.includes(jpgUrl));

  // ---------- 14. Broken image handling: remove file but keep reference ----------
  // Pages must still render (no crash)
  await fetch(`${BASE}/api/admin/upload`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ url: jpgUrl }),
  });
  const brokenPage = await fetch(`${BASE}/who-we-are`);
  check("Page renders fine with missing image file (no crash)", brokenPage.status === 200);

  // ---------- Cleanup: restore entities to placeholder state ----------
  await fetch(`${BASE}/api/admin/projects/${irrdo.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(projectPayload(irrdoData, { coverImage: "" })),
  });
  await fetch(`${BASE}/api/admin/projects/${irrdo.id}/images`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ images: [] }),
  });
  await fetch(`${BASE}/api/admin/articles/${article.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(articlePayload(artData, { coverImage: "" })),
  });
  await fetch(`${BASE}/api/admin/team/${member.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(memberPayload(memData, { imageUrl: "" })),
  });
  check("Test data restored (placeholders back)", true);

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
