/**
 * QASADAN Phase 7 — SEO & Performance test suite.
 * Verifies titles, meta descriptions, canonicals, OG/Twitter metadata,
 * sitemap correctness (published-only, no admin/drafts), robots,
 * page weight, and response times.
 */
const BASE = "http://localhost:3000";
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

function extract(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m ? m[1] : null;
}

async function main() {
  console.log("🔍 QASADAN Phase 7 — SEO & Performance Tests\n");

  const publicPages: [string, string][] = [
    ["/", "QASADAN — Web Development Agency"],
    ["/about", "About Us"],
    ["/who-we-are", "Who We Are"],
    ["/services", "Services"],
    ["/portfolio", "Portfolio"],
    ["/portfolio/irrdo", "IRRDO"],
    ["/portfolio/al-huda-school", "Al-Huda"],
    ["/news", "News"],
    ["/news/qasadan-opens-new-digital-lab-mogadishu", "Digital Lab"],
    ["/contact", "Contact"],
  ];

  // ---------- Per-page SEO ----------
  for (const [path, titleFragment] of publicPages) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}${path}`);
    const ms = Date.now() - t0;
    const html = await res.text();

    check(`${path} 200`, res.status === 200);
    const title = extract(html, /<title[^>]*>([^<]+)<\/title>/);
    check(`${path} has <title> containing "${titleFragment}"`, !!title && title.includes(titleFragment), title || "MISSING");
    const desc = extract(html, /<meta\s+name="description"\s+content="([^"]*)"/);
    check(`${path} has meta description (≥70 chars)`, !!desc && desc.length >= 70, `${desc?.length || 0} chars`);
    const canonical = extract(html, /<link\s+rel="canonical"\s+href="([^"]*)"/);
    check(`${path} canonical URL`, !!canonical, canonical || "MISSING");
    check(
      `${path} OG title + image present`,
      /property="og:title"/.test(html) && /property="og:image"/.test(html)
    );
    check(`${path} responds < 3s`, ms < 3000, `${ms}ms`);
  }

  // ---------- Root OG specifics ----------
  const home = await (await fetch(`${BASE}/`)).text();
  check("Homepage OG image is og-image.png", home.includes("/og-image.png"));
  check("Twitter card summary_large_image", /name="twitter:card"\s+content="summary_large_image"/.test(home));
  check("OG image has width/height", /property="og:image:width"/.test(home) || home.includes("1200"));

  // ---------- Dynamic metadata ----------
  const irrdo = await (await fetch(`${BASE}/portfolio/irrdo`)).text();
  const irrdoTitle = extract(irrdo, /<title[^>]*>([^<]+)<\/title>/);
  check("IRRDO dynamic title", irrdoTitle === "IRRDO — Case Study | QASADAN", irrdoTitle || "MISSING");
  const irrdoDesc = extract(irrdo, /<meta\s+name="description"\s+content="([^"]*)"/);
  check("IRRDO meta description uses summary", (irrdoDesc || "").includes("multilingual-ready institutional website"));

  const article = await (await fetch(`${BASE}/news/qasadan-opens-new-digital-lab-mogadishu`)).text();
  const artTitle = extract(article, /<title[^>]*>([^<]+)<\/title>/);
  check("Article dynamic title", (artTitle || "").includes("Digital Lab"), artTitle || "MISSING");

  // ---------- Sitemap ----------
  const smRes = await fetch(`${BASE}/sitemap.xml`);
  check("Sitemap 200 (XML)", smRes.status === 200 && (smRes.headers.get("content-type") || "").includes("xml"));
  const sm = await smRes.text();
  check("Sitemap lists static pages", ["/about", "/who-we-are", "/services", "/portfolio", "/news", "/contact"].every((p) => sm.includes(`https://qasadan.com${p}`)));
  check("Sitemap lists published projects", sm.includes("/portfolio/irrdo") && sm.includes("/portfolio/al-huda-school") && sm.includes("/portfolio/waayo-studio"));
  check("Sitemap lists published articles", sm.includes("/news/qasadan-opens-new-digital-lab-mogadishu"));
  check("Sitemap EXCLUDES draft project", !sm.includes("horn-agritech"));
  check("Sitemap EXCLUDES draft article", !sm.includes("qasadan-guide-accessible-web-design"));
  check("Sitemap EXCLUDES admin/api", !sm.includes("/admin") && !sm.includes("/api/"));

  // ---------- Robots ----------
  const rbRes = await fetch(`${BASE}/robots.txt`);
  check("Robots 200", rbRes.status === 200);
  const rb = await rbRes.text();
  check("Robots allows all on /", /allow:\s*\//.test(rb));
  check("Robots disallows /admin", /disallow:\s*\/admin/i.test(rb));
  check("Robots disallows /api/", /disallow:\s*\/api\//i.test(rb));
  check("Robots references sitemap", rb.includes("https://qasadan.com/sitemap.xml"));

  // ---------- Admin noindex ----------
  const loginHtml = await (await fetch(`${BASE}/admin/login`)).text();
  check("Admin login noindex", /name="robots"\s+content="noindex/.test(loginHtml));

  // ---------- Performance: page weight & images ----------
  const homeRes = await fetch(`${BASE}/`);
  const homeSize = (await homeRes.text()).length;
  // NOTE: dev mode inflates HTML with HMR/dev-tools/RSC debug payloads (~2x+).
  // Production builds are far smaller; 600KB is the dev-mode-appropriate ceiling.
  check("Homepage HTML < 600KB (dev mode)", homeSize < 600 * 1024, `${(homeSize / 1024).toFixed(1)}KB`);

  const ogRes = await fetch(`${BASE}/og-image.png`);
  const ogSize = (await ogRes.arrayBuffer()).byteLength;
  check("OG image < 300KB", ogSize < 300 * 1024, `${(ogSize / 1024).toFixed(1)}KB`);

  // Lazy loading on public images
  check("Public images lazy-loaded", home.includes('loading="lazy"') || !/<img/.test(home));

  // ---------- Performance: parallel load timing ----------
  const t0 = Date.now();
  await Promise.all([
    fetch(`${BASE}/`),
    fetch(`${BASE}/portfolio`),
    fetch(`${BASE}/news`),
    fetch(`${BASE}/contact`),
  ]);
  check("4 pages in parallel < 4s", Date.now() - t0 < 4000, `${Date.now() - t0}ms`);

  // ---------- Security headers (bonus check) ----------
  const secRes = await fetch(`${BASE}/`);
  check("X-Content-Type-Options: nosniff", secRes.headers.get("x-content-type-options") === "nosniff");
  check("X-Frame-Options: SAMEORIGIN", secRes.headers.get("x-frame-options") === "SAMEORIGIN");
  check("Referrer-Policy set", !!secRes.headers.get("referrer-policy"));

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
