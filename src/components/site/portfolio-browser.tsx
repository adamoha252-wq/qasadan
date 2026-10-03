"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProjectCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import type { PublicProject } from "@/lib/data/public";
import { cn } from "@/lib/utils";

/**
 * Client-side category filter for the portfolio page. The page itself is
 * statically cached (ISR) with all projects embedded; filtering by category
 * happens instantly in the browser with no server round-trip.
 */
export function PortfolioBrowser({ projects }: { projects: PublicProject[] }) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || undefined;

  // Derive categories from published projects
  const categories = Array.from(
    new Set(projects.map((p) => p.category).filter(Boolean))
  ).sort() as string[];

  const filtered = category
    ? projects.filter((p) => p.category === category)
    : projects;

  return (
    <>
      {projects.length > 0 ? (
        <>
          {/* Category filter */}
          {categories.length > 0 && (
            <nav
              aria-label="Filter projects by category"
              className="flex flex-wrap items-center justify-center gap-2"
            >
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
    </>
  );
}
