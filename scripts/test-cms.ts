/**
 * QASADAN Phase 5 — Admin CMS test suite.
 * Tests every CRUD operation for every CMS section, validation, publish
 * workflows, public-website reflection, and authorization on all admin APIs.
 */
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

async function api(path: string, init: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...init,
    headers: { ...(init.headers || {}), ...(cookie ? { cookie } : {}) },
  });
}

async function json(res: Response) {
  return res.json().catch(() => ({}));
}

async function main() {
  console.log("🛠️  QASADAN Phase 5 — Admin CMS Tests\n");

  // ---------- Login ----------
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `198.51.100.${Number(RUN) % 100 + 100}` },
    body: JSON.stringify({ email: "admin@qasadan.com", password: "QasadanAdmin2026!" }),
  });
  check("Admin login for CMS tests", loginRes.status === 200);
  cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
  check("Session cookie captured", cookie.startsWith("qasadan_session="));

  // ---------- AUTHORIZATION: all admin APIs reject anonymous ----------
  const protectedPaths = [
    ["GET", "/api/admin/services"], ["POST", "/api/admin/services"],
    ["GET", "/api/admin/projects"], ["POST", "/api/admin/projects"],
    ["GET", "/api/admin/articles"], ["POST", "/api/admin/articles"],
    ["GET", "/api/admin/categories"], ["POST", "/api/admin/categories"],
    ["GET", "/api/admin/team"], ["POST", "/api/admin/team"],
    ["GET", "/api/admin/testimonials"], ["POST", "/api/admin/testimonials"],
    ["GET", "/api/admin/inquiries"],
    ["GET", "/api/admin/settings"], ["PUT", "/api/admin/settings"],
    ["GET", "/api/admin/stats"],
  ];
  for (const [method, path] of protectedPaths) {
    const savedCookie = cookie;
    cookie = "";
    const res = await api(path, { method, body: method === "GET" ? undefined : "{}" });
    cookie = savedCookie;
    check(`Anonymous ${method} ${path} → 401`, res.status === 401, `got ${res.status}`);
  }

  // ============ SERVICES ============
  console.log("\n— Services —");
  let res = await api("/api/admin/services", {
    method: "POST",
    body: JSON.stringify({
      title: `Test Service ${RUN}`,
      slug: `test-service-${RUN}`,
      description: "A service created by the Phase 5 automated test suite.",
      icon: "Rocket",
      features: ["Feature A", "Feature B"],
      order: 99,
      isActive: true,
    }),
  });
  check("Service CREATE 201", res.status === 201);
  let body = await json(res);
  const serviceId = body.service?.id;
  check("Service created with id", !!serviceId);

  res = await api("/api/admin/services");
  body = await json(res);
  check("Service LIST includes created", body.services?.some((s: { id: string }) => s.id === serviceId));

  res = await api(`/api/admin/services/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: `Test Service ${RUN} Edited`,
      slug: `test-service-${RUN}`,
      description: "Edited description by the Phase 5 automated test suite.",
      icon: "Rocket",
      features: ["Feature A"],
      order: 98,
      isActive: false,
    }),
  });
  check("Service UPDATE 200", res.status === 200);
  body = await json(res);
  check("Service updated fields persisted", body.service?.isActive === false && body.service?.order === 98);

  // Validation: short description
  res = await api("/api/admin/services", {
    method: "POST",
    body: JSON.stringify({ title: "Bad", slug: `bad-${RUN}`, description: "short", features: [] }),
  });
  check("Service CREATE invalid data → 400", res.status === 400);

  // Duplicate slug → 409
  res = await api("/api/admin/services", {
    method: "POST",
    body: JSON.stringify({
      title: "Dup", slug: `test-service-${RUN}`,
      description: "Duplicate slug attempt for testing.", features: [],
    }),
  });
  check("Service duplicate slug → 409", res.status === 409, `got ${res.status}`);

  res = await api(`/api/admin/services/${serviceId}`, { method: "DELETE" });
  check("Service DELETE 200", res.status === 200);
  res = await api(`/api/admin/services/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: "Ghost", slug: `ghost-${RUN}`, description: "This service should not exist anymore.",
      features: [], order: 0, isActive: true,
    }),
  });
  check("Deleted service PATCH → 404", res.status === 404, `got ${res.status}`);

  // ============ PROJECTS (full publish workflow) ============
  console.log("\n— Portfolio projects —");
  res = await api("/api/admin/projects", {
    method: "POST",
    body: JSON.stringify({
      title: `CMS Test Project ${RUN}`,
      slug: `cms-test-project-${RUN}`,
      client: "Test Client",
      category: "Web Development",
      summary: "A project created by the Phase 5 automated test suite.",
      content: "## Test\n\nCase study content.",
      technologies: ["Next.js"],
      isFeatured: false,
      isPublished: false,
      order: 0,
    }),
  });
  check("Project CREATE 201", res.status === 201);
  body = await json(res);
  const projectId = body.project?.id;
  check("Project created with id", !!projectId);

  // Draft project must NOT be public
  const draftPublic = await fetch(`${BASE}/portfolio/cms-test-project-${RUN}`);
  check("Draft project NOT publicly visible (404)", draftPublic.status === 404);

  // Publish it
  res = await api(`/api/admin/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: `CMS Test Project ${RUN}`,
      slug: `cms-test-project-${RUN}`,
      client: "Test Client",
      category: "Web Development",
      summary: "A project created by the Phase 5 automated test suite.",
      content: "## Test\n\nCase study content.",
      technologies: ["Next.js", "Tailwind"],
      isFeatured: true,
      isPublished: true,
      order: 0,
    }),
  });
  check("Project PUBLISH (PATCH) 200", res.status === 200);

  // Now public
  const pubRes = await fetch(`${BASE}/portfolio/cms-test-project-${RUN}`);
  check("Published project publicly visible (200)", pubRes.status === 200);

  // Feature flag visible on homepage
  const home = await (await fetch(`${BASE}/`)).text();
  check("Featured project appears on homepage", home.includes(`CMS Test Project ${RUN}`));

  // Gallery images
  res = await api(`/api/admin/projects/${projectId}/images`, {
    method: "PUT",
    body: JSON.stringify({
      images: [
        { url: "/api/media/test-a.jpg", caption: "Test A", order: 0 },
        { url: "/api/media/test-b.jpg", caption: "", order: 1 },
      ],
    }),
  });
  check("Project images REPLACE 200", res.status === 200);
  body = await json(res);
  check("Two gallery images stored", body.images?.length === 2);

  res = await api(`/api/admin/projects/${projectId}`);
  body = await json(res);
  check("Project GET includes images", body.project?.images?.length === 2);

  // Unpublish → public 404
  await api(`/api/admin/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: `CMS Test Project ${RUN}`,
      slug: `cms-test-project-${RUN}`,
      client: "Test Client",
      category: "Web Development",
      summary: "A project created by the Phase 5 automated test suite.",
      content: "## Test\n\nCase study content.",
      technologies: ["Next.js", "Tailwind"],
      isFeatured: true,
      isPublished: false,
      order: 0,
    }),
  });
  const unpubRes = await fetch(`${BASE}/portfolio/cms-test-project-${RUN}`);
  check("Unpublished project hidden from public (404)", unpubRes.status === 404);

  // Cleanup
  res = await api(`/api/admin/projects/${projectId}`, { method: "DELETE" });
  check("Project DELETE 200", res.status === 200);
  const afterDelete = await fetch(`${BASE}/portfolio/cms-test-project-${RUN}`);
  check("Deleted project public 404", afterDelete.status === 404);

  // ============ NEWS (draft → publish → unpublish → archive → delete) ============
  console.log("\n— News articles —");
  const catRes = await api("/api/admin/categories");
  const cats = (await json(catRes)).categories as { id: string; name: string; slug: string }[];
  const catId = cats[0]?.id;

  res = await api("/api/admin/articles", {
    method: "POST",
    body: JSON.stringify({
      title: `CMS Test Article ${RUN}`,
      slug: `cms-test-article-${RUN}`,
      excerpt: "Test excerpt.",
      content: "Article body created by tests.",
      categoryId: catId || "",
      isPublished: false,
      isArchived: false,
    }),
  });
  check("Article CREATE (draft) 201", res.status === 201);
  body = await json(res);
  const articleId = body.article?.id;
  check("Draft publishedAt is null", body.article?.publishedAt === null);

  const draftArt = await fetch(`${BASE}/news/cms-test-article-${RUN}`);
  check("Draft article NOT public (404)", draftArt.status === 404);

  // Publish
  res = await api(`/api/admin/articles/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: `CMS Test Article ${RUN}`,
      slug: `cms-test-article-${RUN}`,
      excerpt: "Test excerpt.",
      content: "Article body created by tests.",
      categoryId: catId || "",
      isPublished: true,
      isArchived: false,
    }),
  });
  check("Article PUBLISH 200", res.status === 200);
  const pubArt = await fetch(`${BASE}/news/cms-test-article-${RUN}`);
  check("Published article public (200)", pubArt.status === 200);

  // Unpublish
  res = await api(`/api/admin/articles/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: `CMS Test Article ${RUN}`,
      slug: `cms-test-article-${RUN}`,
      excerpt: "Test excerpt.",
      content: "Article body created by tests.",
      categoryId: catId || "",
      isPublished: false,
      isArchived: false,
    }),
  });
  const unpubArt = await fetch(`${BASE}/news/cms-test-article-${RUN}`);
  check("Unpublished article hidden (404)", unpubArt.status === 404);

  // Archive flag persists
  res = await api(`/api/admin/articles/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: `CMS Test Article ${RUN}`,
      slug: `cms-test-article-${RUN}`,
      excerpt: "Test excerpt.",
      content: "Article body created by tests.",
      categoryId: catId || "",
      isPublished: true,
      isArchived: true,
    }),
  });
  body = await json(res);
  check("Archived flag persisted", body.article?.isArchived === true);
  const archArt = await fetch(`${BASE}/news/cms-test-article-${RUN}`);
  check("Archived article hidden from public", archArt.status === 404);

  res = await api(`/api/admin/articles/${articleId}`, { method: "DELETE" });
  check("Article DELETE 200", res.status === 200);

  // ============ CATEGORIES ============
  console.log("\n— News categories —");
  res = await api("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify({ name: `Test Cat ${RUN}`, slug: `test-cat-${RUN}` }),
  });
  check("Category CREATE 201", res.status === 201);
  body = await json(res);
  const testCatId = body.category?.id;

  // Delete with articles → 409 (assign article to category first)
  res = await api("/api/admin/articles", {
    method: "POST",
    body: JSON.stringify({
      title: `Cat Guard Article ${RUN}`,
      slug: `cat-guard-article-${RUN}`,
      content: "x".repeat(20),
      categoryId: testCatId,
      isPublished: false,
      isArchived: false,
    }),
  });
  const guardArticleId = (await json(res)).article?.id;

  res = await api(`/api/admin/categories/${testCatId}`, { method: "DELETE" });
  check("Category delete with articles → 409", res.status === 409);

  // Delete article, then category succeeds
  await api(`/api/admin/articles/${guardArticleId}`, { method: "DELETE" });
  res = await api(`/api/admin/categories/${testCatId}`, { method: "DELETE" });
  check("Category DELETE after reassign 200", res.status === 200);

  // ============ TEAM ============
  console.log("\n— Team —");
  res = await api("/api/admin/team", {
    method: "POST",
    body: JSON.stringify({
      name: `Test Member ${RUN}`,
      role: "Test Role",
      bio: "Bio",
      order: 50,
      isActive: true,
    }),
  });
  check("Team CREATE 201", res.status === 201);
  const memberId = (await json(res)).member?.id;

  res = await api(`/api/admin/team/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: `Test Member ${RUN}`,
      role: "Updated Role",
      bio: "Bio",
      order: 51,
      isActive: false,
    }),
  });
  body = await json(res);
  check("Team UPDATE persisted", body.member?.role === "Updated Role" && body.member?.isActive === false);

  res = await api(`/api/admin/team/${memberId}`, { method: "DELETE" });
  check("Team DELETE 200", res.status === 200);

  // ============ TESTIMONIALS ============
  console.log("\n— Testimonials —");
  res = await api("/api/admin/testimonials", {
    method: "POST",
    body: JSON.stringify({
      clientName: `Test Client ${RUN}`,
      quote: "A fantastic experience from start to finish.",
      rating: 4,
      isPublished: false,
    }),
  });
  check("Testimonial CREATE 201", res.status === 201);
  const testimonialId = (await json(res)).testimonial?.id;

  // Unpublished testimonial must not appear publicly
  const whoWeAre = await (await fetch(`${BASE}/who-we-are`)).text();
  const aboutPage = await (await fetch(`${BASE}/about`)).text();
  check(
    "Unpublished testimonial hidden from public",
    !whoWeAre.includes(`Test Client ${RUN}`) && !aboutPage.includes(`Test Client ${RUN}`)
  );

  res = await api(`/api/admin/testimonials/${testimonialId}`, {
    method: "PATCH",
    body: JSON.stringify({
      clientName: `Test Client ${RUN}`,
      quote: "An updated fantastic experience from start to finish.",
      rating: 5,
      isPublished: true,
    }),
  });
  check("Testimonial UPDATE 200", res.status === 200);
  const aboutAfter = await (await fetch(`${BASE}/about`)).text();
  check("Published testimonial appears on about page", aboutAfter.includes(`Test Client ${RUN}`));

  res = await api(`/api/admin/testimonials/${testimonialId}`, { method: "DELETE" });
  check("Testimonial DELETE 200", res.status === 200);

  // ============ INQUIRIES ============
  console.log("\n— Inquiries —");
  // Public submits an inquiry
  const pubInquiry = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `192.0.2.${Number(RUN) % 200 + 10}` },
    body: JSON.stringify({
      name: `Inquiry Person ${RUN}`,
      email: `inquiry${RUN}@example.com`,
      message: "Please help me with a website for my organization.",
    }),
  });
  check("Public inquiry submitted 201", pubInquiry.status === 201);

  // Admin sees it
  res = await api("/api/admin/inquiries?status=NEW");
  body = await json(res);
  const inquiry = body.inquiries?.find((i: { name: string }) => i.name === `Inquiry Person ${RUN}`);
  check("Admin sees new inquiry", !!inquiry);

  // Anonymous cannot list inquiries
  const savedCookie = cookie;
  cookie = "";
  const anonInq = await api("/api/admin/inquiries");
  cookie = savedCookie;
  check("Anonymous inquiries list → 401", anonInq.status === 401);

  // Status change persists
  if (inquiry) {
    res = await api(`/api/admin/inquiries/${inquiry.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "READ" }),
    });
    check("Inquiry status change 200", res.status === 200);
    res = await api("/api/admin/inquiries");
    body = await json(res);
    const updated = body.inquiries?.find((i: { id: string }) => i.id === inquiry.id);
    check("Inquiry status persisted (READ)", updated?.status === "READ");
    res = await api(`/api/admin/inquiries/${inquiry.id}`, { method: "DELETE" });
    check("Inquiry DELETE 200", res.status === 200);
  }

  // ============ SETTINGS ============
  console.log("\n— Site settings —");
  res = await api("/api/admin/settings");
  body = await json(res);
  const originalEmail = body.settings?.["contact.email"];
  check("Settings GET works", typeof originalEmail === "string");

  res = await api("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ values: { "contact.email": `updated-${RUN}@qasadan.com` } }),
  });
  check("Settings PUT 200", res.status === 200);
  const contactPage = await (await fetch(`${BASE}/contact`)).text();
  check("Public contact page reflects updated email", contactPage.includes(`updated-${RUN}@qasadan.com`));

  // Restore
  await api("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ values: { "contact.email": originalEmail } }),
  });
  const restoredPage = await (await fetch(`${BASE}/contact`)).text();
  check("Settings restored", restoredPage.includes(originalEmail));

  // Unknown key ignored
  res = await api("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ values: { "evil.key": "hack" } }),
  });
  body = await json(res);
  check("Unknown setting keys are ignored", !body.settings?.["evil.key"]);

  // ============ STATS ============
  res = await api("/api/admin/stats");
  body = await json(res);
  check("Stats endpoint works", typeof body.stats?.projects === "number");

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
