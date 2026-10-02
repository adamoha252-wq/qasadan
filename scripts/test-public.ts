/**
 * QASADAN Phase 4 — Public website test suite.
 * Verifies every public route, DB wiring, filtering, publish states,
 * 404 handling, contact form, and security basics.
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

async function get(path: string) {
  return fetch(`${BASE}${path}`, { redirect: "manual" });
}

async function main() {
  console.log("🌐 QASADAN Phase 4 — Public Website Tests\n");

  // ---------- Route: Home ----------
  let res = await get("/");
  const home = await res.text();
  check("Homepage 200", res.status === 200);
  check("Homepage shows hero", home.includes("Digital solutions engineered"));
  check("Homepage shows featured projects (IRRDO)", home.includes("IRRDO"));
  check("Homepage shows featured projects (Al-Huda)", home.includes("Al-Huda"));
  check("Homepage does NOT show draft project (Horn AgriTech)", !home.includes("Horn AgriTech"));
  check("Homepage shows services from DB", home.includes("Web Applications"));
  check("Homepage shows testimonials", home.includes("Dr. Halima Nur"));
  check("Homepage shows latest news", home.includes("Digital Lab"));

  // ---------- Route: About ----------
  res = await get("/about");
  const about = await res.text();
  check("About 200", res.status === 200);
  check("About shows story content", about.includes("Built in Mogadishu"));
  check("About shows mission", about.includes("Our Mission"));
  check("About shows timeline", about.includes("QASADAN is founded"));

  // ---------- Route: Who We Are ----------
  res = await get("/who-we-are");
  const wwa = await res.text();
  check("Who We Are 200", res.status === 200);
  check("Who We Are shows team from DB", wwa.includes("Abdirahman Hassan"));
  check("Who We Are shows process", wwa.includes("A process refined"));

  // ---------- Route: Services ----------
  res = await get("/services");
  const services = await res.text();
  check("Services 200", res.status === 200);
  check("Services lists all 6 active services", 
    ["Web Development", "Web Applications", "UI/UX Design", "Branding &amp; Identity", "SEO &amp; Digital Growth", "Maintenance &amp; Support"]
      .every((s) => services.includes(s)));
  check("Services shows feature bullets", services.includes("Corporate &amp; business websites"));

  // ---------- Route: Portfolio ----------
  res = await get("/portfolio");
  const portfolio = await res.text();
  check("Portfolio 200", res.status === 200);
  check("Portfolio lists published projects", portfolio.includes("IRRDO") && portfolio.includes("Waayo Studio"));
  check("Portfolio hides draft project", !portfolio.includes("Horn AgriTech Market Platform") || !portfolio.includes('href="/portfolio/horn-agritech"'));
  check("Portfolio shows category filters", portfolio.includes("Education") && portfolio.includes("Web Development"));

  // Filtering
  res = await get("/portfolio?category=Education");
  const education = await res.text();
  check("Portfolio filter category=Education shows Al-Huda", education.includes("Al-Huda"));
  check("Portfolio filter category=Education hides IRRDO", !education.includes('href="/portfolio/irrdo"'));
  check("Portfolio filter keeps featured badge", education.includes("Featured"));

  res = await get("/portfolio?category=Nonexistent");
  check("Portfolio filter with unknown category shows empty state", (await res.text()).includes("No projects in this category"));

  // ---------- Route: Portfolio detail ----------
  res = await get("/portfolio/irrdo");
  const irrdo = await res.text();
  check("IRRDO case study 200", res.status === 200);
  check("IRRDO shows client", irrdo.includes("Institute for Research and Rural Development"));
  check("IRRDO shows case study content", irrdo.includes("The Challenge"));
  check("IRRDO shows technologies", irrdo.includes("Next.js"));

  res = await get("/portfolio/al-huda-school");
  const alhuda = await res.text();
  check("Al-Huda case study 200", res.status === 200);
  check("Al-Huda shows admissions content", alhuda.includes("admissions"));
  check("Al-Huda shows parent-focused outcome", alhuda.includes("parents"));

  // Draft project must NOT be accessible
  res = await get("/portfolio/horn-agritech");
  check("Draft project returns 404", res.status === 404, `status=${res.status}`);

  // Unknown project 404
  res = await get("/portfolio/does-not-exist");
  check("Unknown project returns 404", res.status === 404);

  // ---------- Route: News ----------
  res = await get("/news");
  const news = await res.text();
  check("News 200", res.status === 200);
  check("News lists published articles", news.includes("Digital Lab") && news.includes("5 Web Trends"));
  check("News hides draft article (Accessibility guide)", !news.includes("qasadan-guide-accessible-web-design"));
  check("News shows category filters", news.includes("Agency Updates") && news.includes("Industry Insights"));

  // Category filter
  res = await get("/news?category=agency-updates");
  const agencyNews = await res.text();
  check("News filter agency-updates shows Digital Lab article", agencyNews.includes("Digital Lab"));
  check("News filter agency-updates hides trends article", !agencyNews.includes('href="/news/5-web-trends'));

  // ---------- Route: News detail ----------
  res = await get("/news/qasadan-opens-new-digital-lab-mogadishu");
  const article = await res.text();
  check("News article 200", res.status === 200);
  check("Article shows content", article.includes("300-square-metre"));
  check("Article shows category", article.includes("Agency Updates"));

  // Draft article must NOT be accessible
  res = await get("/news/qasadan-guide-accessible-web-design");
  check("Draft article returns 404", res.status === 404, `status=${res.status}`);

  // ---------- Route: Contact ----------
  res = await get("/contact");
  const contact = await res.text();
  check("Contact 200", res.status === 200);
  check("Contact shows email from settings", contact.includes("info@qasadan.com"));
  check("Contact shows phone", contact.includes("+254 700 000 000"));
  check("Contact shows form", contact.includes("Tell us about your project"));

  // ---------- 404 page ----------
  res = await get("/this-page-does-not-exist");
  const notFound = await res.text();
  check("Unknown route returns branded 404", res.status === 404 && notFound.includes("Page not found"));

  // ---------- Contact form API ----------
  const TEST_IP = `192.0.2.${Math.floor(Math.random() * 200) + 10}`;
  const headers = { "Content-Type": "application/json", "x-forwarded-for": TEST_IP };

  res = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Test Sender",
      email: "test.sender@example.com",
      message: "This is a test inquiry from the Phase 4 automated test suite.",
    }),
  });
  check("Contact form valid submission 201", res.status === 201, `status=${res.status}`);

  res = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "X", email: "bad-email", message: "short" }),
  });
  check("Contact form invalid data 400", res.status === 400);

  res = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers,
    body: "{invalid json",
  });
  check("Contact form malformed body 400", res.status === 400);

  // ---------- Admin routes still protected ----------
  res = await get("/admin");
  check("Admin still protected after public build", res.status === 307);
  res = await get("/api/admin/auth/me");
  check("Admin API still protected", res.status === 401);

  console.log(`\n📊 RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("❌ Test suite crashed:", e);
  process.exit(1);
});

export {};
