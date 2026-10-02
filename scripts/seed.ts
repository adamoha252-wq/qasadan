/**
 * QASADAN database seed — run with: bun scripts/seed.ts
 * Seeds admin user, services, portfolio projects (IRRDO, Al-Huda School + drafts),
 * news categories/articles, team, testimonials, sample inquiries, and site settings.
 * IDEMPOTENT: upserts by unique keys, safe to re-run.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const db = new PrismaClient();

const ADMIN_EMAIL = "admin@qasadan.com";
const ADMIN_PASSWORD = "QasadanAdmin2026!";

async function main() {
  console.log("🌱 Seeding QASADAN database...");

  // ---------- Admin user ----------
  const admin = await db.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "QASADAN Administrator",
      role: "ADMIN",
      passwordHash: hashPassword(ADMIN_PASSWORD),
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (role=${admin.role})`);

  // ---------- Services ----------
  const services = [
    {
      title: "Web Development",
      slug: "web-development",
      icon: "Code2",
      order: 1,
      description:
        "We design and build fast, secure, and scalable websites that turn visitors into customers. From corporate sites to e-commerce platforms, every build is optimized for performance, accessibility, and search engines from day one.",
      features: JSON.stringify([
        "Corporate & business websites",
        "E-commerce storefronts",
        "Landing pages that convert",
        "CMS integration",
        "Performance optimization",
      ]),
    },
    {
      title: "Web Applications",
      slug: "web-applications",
      icon: "AppWindow",
      order: 2,
      description:
        "Powerful custom web applications tailored to your workflow — client portals, school management systems, dashboards, and SaaS products. We handle the full lifecycle: discovery, architecture, development, deployment, and support.",
      features: JSON.stringify([
        "Client & partner portals",
        "Management information systems",
        "Dashboards & reporting tools",
        "API design & integration",
        "SaaS product development",
      ]),
    },
    {
      title: "UI/UX Design",
      slug: "ui-ux-design",
      icon: "PenTool",
      order: 3,
      description:
        "Beautiful, intuitive interfaces grounded in user research and industry best practices. We map user journeys, prototype rapidly, and validate with real users before a single line of production code is written.",
      features: JSON.stringify([
        "User research & personas",
        "Wireframes & prototypes",
        "Design systems",
        "Usability testing",
        "Accessibility-first design",
      ]),
    },
    {
      title: "Branding & Identity",
      slug: "branding-identity",
      icon: "Palette",
      order: 4,
      description:
        "A memorable brand built on strategy. We craft logos, visual identities, and brand guidelines that give your organization a consistent, professional voice across every digital and print touchpoint.",
      features: JSON.stringify([
        "Logo & visual identity",
        "Brand guidelines",
        "Typography & color systems",
        "Marketing collateral",
        "Brand refresh & modernization",
      ]),
    },
    {
      title: "SEO & Digital Growth",
      slug: "seo-digital-growth",
      icon: "TrendingUp",
      order: 5,
      description:
        "Get found by the right people. We combine technical SEO, content strategy, and analytics to grow organic traffic and turn your website into a measurable revenue channel.",
      features: JSON.stringify([
        "Technical SEO audits",
        "Keyword & content strategy",
        "Local SEO for East Africa",
        "Analytics & reporting",
        "Conversion optimization",
      ]),
    },
    {
      title: "Maintenance & Support",
      slug: "maintenance-support",
      icon: "ShieldCheck",
      order: 6,
      description:
        "Sleep easy knowing your digital presence is monitored, updated, and backed up. Our care plans cover security patching, content updates, performance tuning, and priority support.",
      features: JSON.stringify([
        "Security monitoring & patching",
        "Regular backups",
        "Content updates",
        "Performance tuning",
        "Priority support SLAs",
      ]),
    },
  ];

  for (const s of services) {
    await db.service.upsert({ where: { slug: s.slug }, update: s, create: s });
  }
  console.log(`  ✓ ${services.length} services`);

  // ---------- Projects ----------
  const projects = [
    {
      title: "IRRDO",
      slug: "irrdo",
      client: "Institute for Research and Rural Development",
      category: "Web Development",
      summary:
        "A modern, multilingual-ready institutional website for IRRDO — showcasing research programs, publications, and community development initiatives across the Horn of Africa.",
      content: `## The Challenge

IRRDO needed a professional digital home that could present decades of research and rural development work to international partners, donors, and local communities. Their previous web presence was outdated, difficult to update, and invisible to search engines.

## What We Delivered

- A clean, institutional design system built around IRRDO's identity
- A structured publication library with filtering by research area and year
- Program pages that clearly communicate impact to funders and partners
- A news and announcements system the IRRDO team updates themselves
- Full technical SEO foundation with structured metadata

## The Result

The new website gives IRRDO a credible, modern platform to showcase research and attract partnership opportunities. Staff can now publish updates without technical support, and the site's performance scores consistently rank above 95 on major auditing tools.`,
      technologies: JSON.stringify(["Next.js", "TypeScript", "Tailwind CSS", "Headless CMS"]),
      isFeatured: true,
      isPublished: true,
      completedAt: new Date("2025-11-15"),
      order: 1,
    },
    {
      title: "Al-Huda Primary & Secondary School",
      slug: "al-huda-school",
      client: "Al-Huda Primary & Secondary School",
      category: "Education",
      summary:
        "A complete digital platform for Al-Huda School — admissions information, academic programs, school news, and parent communication for a growing Mogadishu institution.",
      content: `## The Challenge

Al-Huda Primary & Secondary School relied entirely on word-of-mouth and paper notices. Parents had no central place to find admission requirements, term dates, or school news, and the administration spent hours answering the same phone questions.

## What We Delivered

- A warm, trustworthy design that reflects the school's values
- A clear admissions journey with requirements, fees, and step-by-step guidance
- Academic program pages for both primary and secondary levels
- A news and events section for term announcements and celebrations
- Mobile-first design — most parents visit from a phone

## The Result

Admission inquiries now arrive through the website contact form with complete information, dramatically reducing phone administration. The school reports a noticeable rise in applications and parents praise how easy it is to find term dates and school news on their phones.`,
      technologies: JSON.stringify(["Next.js", "TypeScript", "Tailwind CSS", "Contact Forms"]),
      isFeatured: true,
      isPublished: true,
      completedAt: new Date("2026-03-20"),
      order: 2,
    },
    {
      title: "Waayo Studio Portfolio Platform",
      slug: "waayo-studio",
      client: "Waayo Studio",
      category: "Web Development",
      summary:
        "A striking portfolio platform for a Mogadishu creative studio, with a custom gallery, case-study storytelling, and an inquiry pipeline integrated with their workflow.",
      content: `## The Challenge

Waayo Studio's work deserved better than a social media page. They needed a portfolio that loaded fast, looked stunning on mobile, and converted visitors into paying clients.

## What We Delivered

- A bold, image-first portfolio with lazy-loaded galleries
- Case-study pages with scrollytelling layouts
- An inquiry form that feeds directly into their project pipeline
- Lighthouse performance scores of 98+ across the board

## The Result

Waayo Studio now closes larger contracts with clients who discover them through search, and their case studies do the selling before the first call.`,
      technologies: JSON.stringify(["Next.js", "Framer Motion", "Tailwind CSS"]),
      isFeatured: false,
      isPublished: true,
      completedAt: new Date("2026-06-10"),
      order: 3,
    },
    {
      title: "Horn AgriTech Market Platform",
      slug: "horn-agritech",
      client: "Horn AgriTech (in development)",
      category: "Web Applications",
      summary:
        "A marketplace and price-information platform connecting Somali farmers with urban buyers — live commodity prices, verified listings, and mobile money integration. (Draft — in active development.)",
      content: `## The Vision

Horn AgriTech aims to digitize the farm-to-market supply chain. The platform will provide live commodity price data, verified seller listings, and secure mobile-money escrow payments.

## Status

This project is currently in active development. This entry is a draft and is not publicly visible.`,
      technologies: JSON.stringify(["Next.js", "PostgreSQL", "Mapbox", "Mobile Money APIs"]),
      isFeatured: false,
      isPublished: false,
      completedAt: null,
      order: 4,
    },
  ];

  for (const p of projects) {
    await db.project.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  console.log(`  ✓ ${projects.length} projects (3 published, 1 draft)`);

  // ---------- News categories ----------
  const categories = [
    { name: "Agency Updates", slug: "agency-updates" },
    { name: "Web Development", slug: "web-development" },
    { name: "Design", slug: "design" },
    { name: "Industry Insights", slug: "industry-insights" },
  ];
  const catIds: Record<string, string> = {};
  for (const c of categories) {
    const row = await db.newsCategory.upsert({ where: { slug: c.slug }, update: c, create: c });
    catIds[c.slug] = row.id;
  }
  console.log(`  ✓ ${categories.length} news categories`);

  // ---------- News articles ----------
  const articles = [
    {
      title: "QASADAN Opens New Digital Lab in Mogadishu",
      slug: "qasadan-opens-new-digital-lab-mogadishu",
      categoryId: catIds["agency-updates"],
      excerpt:
        "Our new lab expands capacity for client projects and creates a training space for the next generation of Somali developers and designers.",
      isPublished: true,
      publishedAt: new Date("2026-09-01"),
      content: `We are proud to announce the opening of the new QASADAN Digital Lab in Mogadishu. The 300-square-metre space brings our design, engineering, and support teams under one roof for the first time.

The lab is more than an office. It houses a usability testing room where real users interact with our products before launch, a dedicated QA station for device and browser testing, and a training area where we run our junior developer mentorship programme.

For our clients, the lab means faster turnaround, deeper quality assurance, and a place to workshop their digital strategy face to face. For our team, it represents a commitment to building world-class digital capability right here in Somalia.

Come visit us — the coffee is always on.`,
    },
    {
      title: "5 Web Trends East African Businesses Can't Ignore in 2026",
      slug: "5-web-trends-east-african-businesses-2026",
      categoryId: catIds["industry-insights"],
      excerpt:
        "From mobile-first mandates to AI-assisted content, the web is changing fast. Here are the five shifts we see mattering most for businesses in our region.",
      isPublished: true,
      publishedAt: new Date("2026-08-18"),
      content: `The web doesn't wait, and neither should your business. After shipping more than fifty digital projects across the region, here are the five trends we believe deserve your attention in 2026.

**1. Mobile-first is now mobile-only.** For many of your customers, the phone is the only device. If your site frustrates on mobile, you don't exist. Design for the thumb, not just the eye.

**2. Speed is a feature.** Every second of load time costs conversions. Modern frameworks make sub-second loads achievable — there is no excuse anymore.

**3. AI-assisted content, human-edited.** Teams that use AI to draft and humans to refine publish more, rank better, and sound more like themselves.

**4. Local SEO wins contracts.** "Near me" and city-based searches dominate commercial queries in East Africa. Structured local data is the cheapest marketing you'll ever do.

**5. Accessibility is table stakes.** Inclusive design widens your audience and increasingly protects you from legal risk. Semantic HTML and proper contrast are the new minimum standard.

Want a free assessment of where your site stands on these five? Get in touch.`,
    },
    {
      title: "How We Built Al-Huda School's Online Admissions Journey",
      slug: "how-we-built-al-huda-admissions",
      categoryId: catIds["web-development"],
      excerpt:
        "A behind-the-scenes look at the research, design, and engineering behind one of our most impactful education projects.",
      isPublished: true,
      publishedAt: new Date("2026-05-05"),
      content: `When Al-Huda Primary & Secondary School approached us, their admission season was chaos: phone calls, paper forms, and parents queuing at the front office. Here is how we turned that into a calm, digital journey.

**Research first.** We interviewed parents, teachers, and administrators before designing anything. The insight that shaped everything: most parents browse exclusively on inexpensive Android phones, often on 3G. Performance wasn't a nice-to-have — it was the product.

**Designing the journey.** We mapped the admission funnel from first question to submitted application, removing every step that didn't earn its place. The final flow asks only for what the school genuinely needs.

**Building for reality.** The site ships as a static-first Next.js application with aggressive image optimization, so it loads in under two seconds even on modest connections.

The result: admission inquiries now arrive complete and organized, and the school front office finally breathes during registration season.`,
    },
    {
      title: "The QASADAN Guide to Accessible Web Design",
      slug: "qasadan-guide-accessible-web-design",
      categoryId: catIds["design"],
      excerpt:
        "Accessibility is not a feature you add at the end — it is a discipline you practice from the first sketch. Our team's practical guide. (Draft — publishing soon.)",
      isPublished: false,
      publishedAt: null,
      content: `This article is still in draft. It will cover semantic HTML foundations, colour contrast in practice, keyboard navigation patterns, screen-reader testing on a budget, and the business case for inclusive design in East African markets.

This draft entry is not publicly visible and exists to test the CMS publish/unpublish workflow.`,
    },
  ];

  for (const a of articles) {
    await db.newsArticle.upsert({ where: { slug: a.slug }, update: a, create: a });
  }
  console.log(`  ✓ ${articles.length} news articles (3 published, 1 draft)`);

  // ---------- Team ----------
  const team = [
    {
      name: "Abdirahman Hassan",
      role: "Founder & CEO",
      order: 1,
      bio: "Abdirahman founded QASADAN with a conviction that world-class digital work can be done in Somalia. He leads strategy and client partnerships, and still reviews every line of the proposals we send.",
    },
    {
      name: "Fardawsa Ahmed",
      role: "Lead Designer",
      order: 2,
      bio: "Fardawsa turns complex requirements into interfaces people love. A typography obsessive and accessibility advocate, she has designed digital products for education, agriculture, and public sector clients.",
    },
    {
      name: "Mohamed Ali",
      role: "Senior Full-Stack Developer",
      order: 3,
      bio: "Mohamed architects our web applications and keeps our performance scores in the high nineties. When he isn't shipping, he mentors juniors in our Digital Lab programme.",
    },
    {
      name: "Amina Yusuf",
      role: "Project Manager",
      order: 4,
      bio: "Amina keeps every QASADAN project on time, on budget, and clearly communicated. Clients know her as the person who always knows exactly where things stand.",
    },
  ];
  for (const t of team) {
    const existing = await db.teamMember.findFirst({ where: { name: t.name } });
    if (!existing) await db.teamMember.create({ data: t });
  }
  console.log(`  ✓ ${team.length} team members`);

  // ---------- Testimonials ----------
  const testimonials = [
    {
      clientName: "Dr. Halima Nur",
      clientRole: "Executive Director",
      company: "IRRDO",
      quote:
        "QASADAN delivered a website our international partners compliment us on. The team understood a research organization's needs better than agencies twice their size.",
      rating: 5,
    },
    {
      clientName: "Sheikh Omar Farah",
      clientRole: "Principal",
      company: "Al-Huda Primary & Secondary School",
      quote:
        "Parents now find everything they need on our website. Admission inquiries arrive organized, and our office runs calmer. The QASADAN team was patient, professional, and genuinely cared.",
      rating: 5,
    },
    {
      clientName: "Layla Jama",
      clientRole: "Founder",
      company: "Waayo Studio",
      quote:
        "Our new portfolio doesn't just look incredible — it wins us bigger contracts. Clients tell us the case studies sold them before we ever spoke.",
      rating: 5,
    },
  ];
  for (const t of testimonials) {
    const existing = await db.testimonial.findFirst({ where: { clientName: t.clientName } });
    if (!existing) await db.testimonial.create({ data: t });
  }
  console.log(`  ✓ ${testimonials.length} testimonials`);

  // ---------- Sample inquiries ----------
  const inquiryCount = await db.inquiry.count();
  if (inquiryCount === 0) {
    await db.inquiry.createMany({
      data: [
        {
          name: "Ahmed Warsame",
          email: "ahmed.warsame@example.com",
          phone: "+252 61 000 0001",
          subject: "School website inquiry",
          message:
            "We run a private school in Hargeisa and would like a website similar to the Al-Huda School project. What is the timeline and cost range?",
          status: "NEW",
        },
        {
          name: "Fatima Aden",
          email: "fatima.aden@example.org",
          subject: "NGO partnership",
          message:
            "Our organization needs a platform to publish research reports and accept grant applications. Can we schedule a call next week?",
          status: "READ",
        },
      ],
    });
    console.log("  ✓ 2 sample inquiries");
  }

  // ---------- Site settings ----------
  const settings: Record<string, string> = {
    "contact.email": "info@qasadan.com",
    "contact.phone": "+254 700 000 000",
    "contact.address": "Mogadishu, Somalia",
    "social.facebook": "https://facebook.com/qasadan",
    "social.twitter": "https://x.com/qasadan",
    "social.linkedin": "https://linkedin.com/company/qasadan",
    "social.instagram": "https://instagram.com/qasadan",
    "site.tagline": "Web Development Agency",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`  ✓ ${Object.keys(settings).length} site settings`);

  console.log("\n✅ Seed complete.");
  console.log(`   Admin login → email: ${ADMIN_EMAIL} / password: ${ADMIN_PASSWORD} (change after first login)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
