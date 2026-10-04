import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { Hero } from "@/components/site/hero";
import {
  MissionValues,
  ServicesDark,
  TeamShowcase,
  PricingSection,
  PartnersSection,
  ContactCTA,
} from "@/components/site/home-sections";
import { Reveal } from "@/components/site/reveal";
import { ProjectCard, ArticleCard, TestimonialCard } from "@/components/site/cards";
import {
  getPublishedServices,
  getPublishedProjects,
  getPublishedArticles,
  getPublishedTestimonials,
  getActiveTeamMembers,
  getSiteStats,
  getPricingPlans,
  getPartners,
} from "@/lib/data/public";

export const metadata: Metadata = {
  title: "QASADAN — Web Development Agency",
  description:
    "QASADAN is a full-service web development agency crafting high-performance websites, web applications, and digital products for organizations across East Africa and beyond.",
  alternates: { canonical: "/" },
};

// ISR: pages are cached on Vercel's global edge for fast delivery and
// auto-refresh (max 60s) or instantly when content is saved in the admin CMS.
export const revalidate = 60;

export default async function HomePage() {
  const [
    services,
    projects,
    articles,
    testimonials,
    team,
    stats,
    plans,
    partners,
  ] = await Promise.all([
    getPublishedServices(),
    getPublishedProjects(),
    getPublishedArticles(2),
    getPublishedTestimonials(),
    getActiveTeamMembers(),
    getSiteStats(),
    getPricingPlans(),
    getPartners(),
  ]);

  const featuredProjects = projects.filter((p) => p.isFeatured).slice(0, 2);
  const portfolioPreview = (featuredProjects.length > 0 ? featuredProjects : projects).slice(0, 2);

  return (
    <>
      {/* Hero — full-screen gradient + animated stats band (admin-editable) */}
      <Hero stats={stats} />

      {/* Mission / Vision / Values */}
      <MissionValues />

      {/* Portfolio preview */}
      <section aria-labelledby="portfolio-heading" className="bg-white py-20 lg:py-24">
        <div className="container-site flex flex-col gap-12">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeading
                align="left"
                eyebrow="Our Work"
                title="Real projects, real impact"
                description="A selection of recent engagements — from institutional websites to custom platforms."
                className="max-w-2xl"
              />
              <Link
                href="/portfolio"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
              >
                All projects
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
          {portfolioPreview.length > 0 ? (
            <Reveal stagger className="grid gap-6 md:grid-cols-2">
              {portfolioPreview.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </Reveal>
          ) : (
            <p className="text-sm text-slate-500">Featured projects coming soon.</p>
          )}
        </div>
      </section>

      {/* Services — dark band */}
      <ServicesDark services={services} />

      {/* Team — numbered cards */}
      {team.length > 0 && <TeamShowcase members={team} />}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section aria-labelledby="testimonials-heading" className="bg-white py-20 lg:py-24">
          <div className="container-site flex flex-col gap-12">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="Client Voices"
                title="What our clients say"
                description="Honest words from the leaders who trust us with their digital presence."
              />
            </Reveal>
            <Reveal stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 3).map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* Pricing — admin-editable plans */}
      <PricingSection plans={plans} />

      {/* Partners — admin-editable grid */}
      <PartnersSection partners={partners} />

      {/* Latest news */}
      {articles.length > 0 && (
        <section aria-labelledby="news-heading" className="bg-slate-50 py-20 lg:py-24">
          <div className="container-site flex flex-col gap-12">
            <Reveal>
              <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
                <SectionHeading
                  align="left"
                  eyebrow="News & Insights"
                  title="From the QASADAN blog"
                  className="max-w-2xl"
                />
                <Link
                  href="/news"
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
                >
                  All articles
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
            <Reveal stagger className="grid gap-6 md:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* Contact CTA — quick actions + gradient band */}
      <ContactCTA />
    </>
  );
}
