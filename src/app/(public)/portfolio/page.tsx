import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/site/section-heading";
import { ProjectCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { getPublishedProjects } from "@/lib/data/public";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Explore QASADAN's portfolio — websites, platforms, and digital products for schools, NGOs, and businesses across East Africa, including IRRDO and Al-Huda School.",
  alternates: { canonical: "/portfolio" },
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const projects = await getPublishedProjects();

  // Derive categories from published projects
  const categories = Array.from(
    new Set(projects.map((p) => p.category).filter(Boolean))
  ).sort() as string[];

  const filtered = category
    ? projects.filter((p) => p.category === category)
    : projects;

  return (
    <>
      {/* Hero */}
      <section className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20" aria-labelledby="portfolio-hero">
        <div className="container-site relative flex flex-col items-center gap-6 text-center">
          <h1
            id="portfolio-hero"
            className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            Our Portfolio
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            Real projects, real outcomes. A selection of the websites, platforms, and
            products we have shipped for organizations we believe in.
          </p>
        </div>
      </section>

      {/* Filter + grid */}
      <section aria-labelledby="portfolio-list" className="bg-white py-16 lg:py-20">
        <div className="container-site flex flex-col gap-10">
          <h2 id="portfolio-list" className="sr-only">
            Project list
          </h2>

          {projects.length > 0 ? (
            <>
              {/* Category filter */}
              {categories.length > 0 && (
                <nav aria-label="Filter projects by category" className="flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href="/portfolio"
                    aria-current={!category ? "true" : undefined}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
                      !category
                        ? "border-navy-800 bg-navy-800 text-white"
                        : "border-slate-200 bg-white text-navy-700 hover:border-cyan-300 hover:text-cyan-700"
                    )}
                  >
                    All
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat}
                      href={`/portfolio?category=${encodeURIComponent(cat)}`}
                      aria-current={category === cat ? "true" : undefined}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
                        category === cat
                          ? "border-navy-800 bg-navy-800 text-white"
                          : "border-slate-200 bg-white text-navy-700 hover:border-cyan-300 hover:text-cyan-700"
                      )}
                    >
                      {cat}
                    </Link>
                  ))}
                </nav>
              )}

              {filtered.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No projects in this category yet"
                  description="Try another category or view all of our work."
                />
              )}
            </>
          ) : (
            <EmptyState
              title="Portfolio coming soon"
              description="We are preparing our latest case studies. Check back shortly — or contact us to hear about work in progress."
            />
          )}
        </div>
      </section>
    </>
  );
}
