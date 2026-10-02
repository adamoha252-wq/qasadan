/**
 * Removes test-run artifacts from the database, restoring the professional
 * seeded state (keeps the 2 seeded sample inquiries and all seed content).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TEST_INQUIRY_PATTERNS = [
  "test.sender@example.com",
  "browser-test@example.com",
  "sqli@test.com",
  "xss@test.com",
  /^inquiry\d+@example\.com$/,
  /^ahmed\.warsame@example\.com$/, // seeded sample? NO — this one is SEEDED, do not remove
];

async function main() {
  console.log("🧹 Cleaning test artifacts…");

  // Keep the two seeded inquiries (ahmed.warsame@example.com, fatima.aden@example.org)
  const seededEmails = ["ahmed.warsame@example.com", "fatima.aden@example.org"];
  const removedInquiries = await db.inquiry.deleteMany({
    where: { email: { notIn: seededEmails } },
  });
  console.log(`  ✓ Removed ${removedInquiries.count} test inquiries`);

  const removedServices = await db.service.deleteMany({
    where: { OR: [{ title: { contains: "Test Service" } }, { title: { contains: "UI Test" } }, { title: "Ghost" }] },
  });
  console.log(`  ✓ Removed ${removedServices.count} test services`);

  const removedProjects = await db.project.deleteMany({
    where: { title: { contains: "CMS Test" } },
  });
  console.log(`  ✓ Removed ${removedProjects.count} test projects`);

  const removedArticles = await db.newsArticle.deleteMany({
    where: { OR: [{ title: { contains: "CMS Test" } }, { title: { contains: "Cat Guard" } }] },
  });
  console.log(`  ✓ Removed ${removedArticles.count} test articles`);

  const removedCategories = await db.newsCategory.deleteMany({
    where: { name: { contains: "Test Cat" } },
  });
  console.log(`  ✓ Removed ${removedCategories.count} test categories`);

  const removedTeam = await db.teamMember.deleteMany({
    where: { name: { contains: "Test Member" } },
  });
  console.log(`  ✓ Removed ${removedTeam.count} test team members`);

  const removedTestimonials = await db.testimonial.deleteMany({
    where: { clientName: { contains: "Test Client" } },
  });
  console.log(`  ✓ Removed ${removedTestimonials.count} test testimonials`);

  // Expired/orphan sessions
  const removedSessions = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`  ✓ Removed ${removedSessions.count} expired sessions`);

  const counts = {
    services: await db.service.count(),
    projects: await db.project.count(),
    articles: await db.newsArticle.count(),
    categories: await db.newsCategory.count(),
    team: await db.teamMember.count(),
    testimonials: await db.testimonial.count(),
    inquiries: await db.inquiry.count(),
  };
  console.log("  Final counts:", JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error("cleanup failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

export {};
