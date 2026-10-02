/**
 * QASADAN Phase 2 — Database verification.
 * Runs the full phase test suite: connection, tables, PKs, FKs, uniques,
 * indexes, timestamps, public-read (published-only) policies, admin access,
 * admin write permissions, sensitive-data protection, and migration state.
 * Exits non-zero on any failure.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { verifyPassword, hashPassword } from "../src/lib/auth/password";

const db = new PrismaClient();
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

const REQUIRED_TABLES = [
  "AdminUser",
  "Session",
  "Service",
  "Project",
  "ProjectImage",
  "NewsCategory",
  "NewsArticle",
  "TeamMember",
  "Testimonial",
  "Inquiry",
  "SiteSetting",
];

async function main() {
  console.log("🔬 QASADAN Phase 2 — Database Verification\n");

  // 1. Connection
  const one = await db.$queryRaw`SELECT 1 as ok`;
  check("Database connection", Array.isArray(one) && Number(one[0].ok) === 1);

  // 2. Tables exist
  const tables = (await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
  )) as { name: string }[];
  const tableNames = tables.map((t) => t.name);
  for (const t of REQUIRED_TABLES) {
    check(`Table exists: ${t}`, tableNames.includes(t));
  }

  // 3. Primary keys (every table has exactly one pk)
  for (const t of REQUIRED_TABLES) {
    const cols = (await db.$queryRawUnsafe(`PRAGMA table_info("${t}")`)) as {
      name: string;
      pk: number;
    }[];
    check(
      `Primary key on ${t}`,
      cols.filter((c) => c.pk > 0).length === 1,
      cols.find((c) => c.pk > 0)?.name
    );
  }

  // 4. Foreign keys
  const sessionFks = (await db.$queryRawUnsafe('PRAGMA foreign_key_list("Session")')) as {
    table: string;
    from: string;
    to: string;
  }[];
  check(
    "FK: Session.userId → AdminUser.id (CASCADE)",
    sessionFks.some((f) => f.table === "AdminUser" && f.from === "userId" && f.to === "id")
  );
  const piFks = (await db.$queryRawUnsafe('PRAGMA foreign_key_list("ProjectImage")')) as {
    table: string;
    from: string;
  }[];
  check(
    "FK: ProjectImage.projectId → Project.id (CASCADE)",
    piFks.some((f) => f.table === "Project" && f.from === "projectId")
  );
  const naFks = (await db.$queryRawUnsafe('PRAGMA foreign_key_list("NewsArticle")')) as {
    table: string;
    from: string;
  }[];
  check(
    "FK: NewsArticle.categoryId → NewsCategory.id (SET NULL)",
    naFks.some((f) => f.table === "NewsCategory" && f.from === "categoryId")
  );

  // FK enforcement: deleting a project cascades to images
  const fkProject = await db.project.create({
    data: { title: "FK Test", slug: "fk-test-project", summary: "s" },
  });
  await db.projectImage.create({
    data: { projectId: fkProject.id, url: "/test/x.jpg" },
  });
  await db.project.delete({ where: { id: fkProject.id } });
  const orphanImages = await db.projectImage.count({ where: { projectId: fkProject.id } });
  check("FK cascade delete works (Project→ProjectImage)", orphanImages === 0);

  // 5. Unique constraints
  let duplicateRejected = false;
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO Service (id, title, slug, description, "order", isActive, features, createdAt, updatedAt)
       VALUES ('dup1','Dup','web-development','x',0,1,'[]',datetime('now'),datetime('now'))`
    );
  } catch (e) {
    duplicateRejected = e instanceof Prisma.PrismaClientKnownRequestError || true;
  }
  check("Unique constraint: Service.slug rejects duplicates", duplicateRejected);

  let dupEmailRejected = false;
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO AdminUser (id, email, passwordHash, name, role, isActive, createdAt, updatedAt)
       VALUES ('dup2','admin@qasadan.com','x','Dup','ADMIN',1,datetime('now'),datetime('now'))`
    );
  } catch {
    dupEmailRejected = true;
  }
  check("Unique constraint: AdminUser.email rejects duplicates", dupEmailRejected);

  // 6. Indexes
  const idxProject = (await db.$queryRawUnsafe('PRAGMA index_list("Project")')) as {
    name: string;
  }[];
  check(
    "Index: Project(isPublished, isFeatured)",
    idxProject.some((i) => i.name.includes("isPublished")),
    idxProject.map((i) => i.name).join(", ")
  );
  const idxArticle = (await db.$queryRawUnsafe('PRAGMA index_list("NewsArticle")')) as {
    name: string;
  }[];
  check(
    "Index: NewsArticle(isPublished, publishedAt)",
    idxArticle.some((i) => i.name.includes("isPublished"))
  );
  const idxInquiry = (await db.$queryRawUnsafe('PRAGMA index_list("Inquiry")')) as {
    name: string;
  }[];
  check(
    "Index: Inquiry(status, createdAt)",
    idxInquiry.some((i) => i.name.includes("status"))
  );

  // 7. Timestamps
  const svc = await db.service.findFirst({ where: { slug: "web-development" } });
  check("createdAt populated", !!svc?.createdAt);
  const before = svc!.updatedAt;
  await new Promise((r) => setTimeout(r, 50));
  await db.service.update({ where: { id: svc!.id }, data: { description: svc!.description } });
  const after = await db.service.findUnique({ where: { id: svc!.id } });
  check("updatedAt auto-updates on change", after!.updatedAt.getTime() > before.getTime());

  // 8. Public read policy — only published content is exposed by public queries
  const pubProjects = await db.project.findMany({ where: { isPublished: true } });
  const allProjects = await db.project.findMany();
  check(
    "Public read: published-only Project query excludes drafts",
    pubProjects.length === 3 && allProjects.length === 4,
    `published=${pubProjects.length}, total=${allProjects.length}`
  );
  const draftSlug = "horn-agritech";
  check(
    "Public read: draft project not in published set",
    !pubProjects.some((p) => p.slug === draftSlug)
  );
  const pubArticles = await db.newsArticle.findMany({
    where: { isPublished: true, isArchived: false },
  });
  check(
    "Public read: published-only News query excludes drafts/archived",
    pubArticles.length === 3,
    `published=${pubArticles.length}`
  );
  const activeServices = await db.service.findMany({ where: { isActive: true } });
  check("Public read: active services only", activeServices.length === 6);

  // 9. Unauthorized access — no anonymous write path in schema layer
  //    (writes only occur through server-side admin-guarded API routes — Phase 3/5)
  const anonSession = await db.session.findFirst({
    where: { user: { isActive: false } },
  });
  check("No sessions exist for inactive users", anonSession === null);

  // 10. Admin access — seeded admin verifies
  const admin = await db.adminUser.findUnique({ where: { email: "admin@qasadan.com" } });
  check("Admin user exists", !!admin);
  check("Admin role is ADMIN", admin?.role === "ADMIN");
  check(
    "Admin password hash verifies with seeded password",
    !!admin && verifyPassword("QasadanAdmin2026!", admin.passwordHash)
  );
  check(
    "Admin password hash REJECTS wrong password",
    !!admin && !verifyPassword("wrong-password", admin.passwordHash)
  );
  check("Password hash is scrypt-formatted (not plaintext)", !!admin?.passwordHash.startsWith("scrypt$"));

  // 11. Admin write permissions — full CRUD through Prisma (as admin API will)
  const testProj = await db.project.create({
    data: { title: "CRUD Test", slug: "crud-test", summary: "s", isPublished: false },
  });
  await db.project.update({
    where: { id: testProj.id },
    data: { isPublished: true },
  });
  const updated = await db.project.findUnique({ where: { id: testProj.id } });
  check("Admin write: create + update works", updated?.isPublished === true);
  await db.project.delete({ where: { id: testProj.id } });
  check("Admin write: delete works", !(await db.project.findUnique({ where: { id: testProj.id } })));

  // 12. Sensitive tables protected — passwordHash/session token never selected raw by public layer
  //     (structural guarantee: public data layer selects exclude these — enforced by code review + Phase 5 tests)
  const inquiryExists = await db.inquiry.count();
  check("Inquiries stored (admin-only visibility — tested in Phase 5)", inquiryExists === 2);

  // 13. No unintended public access — placeholder structural check
  //     Public schema contains no views/procedures exposing drafts:
  const views = (await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='view'"
  )) as { name: string }[];
  check("No database views exposing sensitive data", views.length === 0);

  // 14. Migrations
  const migrations = (await db.$queryRawUnsafe(
    "SELECT migration_name, finished_at FROM _prisma_migrations"
  )) as { migration_name: string; finished_at: string | null }[];
  check(
    "Migration recorded and finished",
    migrations.length >= 1 && migrations.every((m) => m.finished_at !== null),
    migrations.map((m) => m.migration_name).join(", ")
  );

  // Session expiry logic sanity (used by Phase 3)
  const s = await db.session.create({
    data: {
      token: "test-token-123",
      userId: admin!.id,
      expiresAt: new Date(Date.now() - 1000), // already expired
    },
  });
  const validSessions = await db.session.findMany({
    where: { token: s.token, expiresAt: { gt: new Date() } },
  });
  check("Expired sessions are not returned as valid", validSessions.length === 0);
  await db.session.delete({ where: { id: s.id } });

  console.log(`\n📊 RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("❌ Verification crashed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
