import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsBrowser } from "@/components/site/news-browser";
import { getPublishedArticleCards, getNewsCategories } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "News & Insights",
  description:
    "The latest from QASADAN — agency updates, web development insights, design thinking, and industry trends for East African businesses.",
  alternates: { canonical: "/news" },
};

// ISR: cached for speed; auto-refreshes (max 60s) or instantly via the admin CMS.
export const revalidate = 60;

export default async function NewsPage() {
  const [articles, categories] = await Promise.all([
    getPublishedArticleCards(),
    getNewsCategories(),
  ]);

  return (
    <>
      {/* Hero */}
      <section
        className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20"
        aria-labelledby="news-hero"
      >
        <div className="container-site relative flex flex-col items-center gap-6 text-center">
          <h1
            id="news-hero"
            className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            News &amp; Insights
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            Agency updates, engineering deep-dives, and practical insights for
            organizations building their digital presence.
          </p>
        </div>
      </section>

      {/* Articles — category filter + pagination run client-side on cached data */}
      <section aria-labelledby="news-list" className="bg-white py-16 lg:py-20">
        <div className="container-site flex flex-col gap-10">
          <h2 id="news-list" className="sr-only">
            Article list
          </h2>
          <Suspense fallback={null}>
            <NewsBrowser articles={articles} categories={categories} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
