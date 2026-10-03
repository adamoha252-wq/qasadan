import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioBrowser } from "@/components/site/portfolio-browser";
import { getPublishedProjects } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Explore QASADAN's portfolio — websites, platforms, and digital products for schools, NGOs, and businesses across East Africa, including IRRDO and Al-Huda School.",
  alternates: { canonical: "/portfolio" },
};

// ISR: cached for speed; auto-refreshes (max 60s) or instantly via the admin CMS.
export const revalidate = 60;

export default async function PortfolioPage() {
  const projects = await getPublishedProjects();

  return (
    <>
      {/* Hero */}
      <section
        className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20"
        aria-labelledby="portfolio-hero"
      >
        <div className="container-site relative flex flex-col items-center gap-6 text-center">
          <h1
            id="portfolio-hero"
            className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            Our Portfolio
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            Real projects, real outcomes. A selection of the websites, platforms,
            and products we have shipped for organizations we believe in.
          </p>
        </div>
      </section>

      {/* Projects — category filter runs client-side on cached data */}
      <section
        aria-labelledby="portfolio-list"
        className="bg-white py-16 lg:py-20"
      >
        <div className="container-site flex flex-col gap-10">
          <h2 id="portfolio-list" className="sr-only">
            Project list
          </h2>
          <Suspense fallback={null}>
            <PortfolioBrowser projects={projects} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
