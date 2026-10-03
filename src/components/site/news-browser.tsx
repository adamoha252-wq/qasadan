"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import type { PublicArticle } from "@/lib/data/public";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

type NewsCategory = { id: string; name: string; slug: string };

/**
 * Client-side category filter + pagination for the news page. The page itself
 * is statically cached (ISR) with all articles embedded; browsing categories
 * and pages happens instantly in the browser with no server round-trip.
 */
export function NewsBrowser({
  articles,
  categories,
}: {
  articles: PublicArticle[];
  categories: NewsCategory[];
}) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || undefined;
  const pageParam = searchParams.get("page") || "1";
  const page = Math.max(1, parseInt(pageParam, 10) || 1);

  const filtered = category
    ? articles.filter((a) => a.category?.slug === category)
    : articles;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const buildUrl = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (next.page) params.set("page", next.page);
    const qs = params.toString();
    return `/news${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      {articles.length > 0 ? (
        <>
          {/* Category filter */}
          {categories.length > 0 && (
            <nav
              aria-label="Filter articles by category"
              className="flex flex-wrap items-center justify-center gap-2"
            >
              <Link
                href="/news"
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
                  key={cat.id}
                  href={`/news?category=${encodeURIComponent(cat.slug)}`}
                  aria-current={category === cat.slug ? "true" : undefined}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
                    category === cat.slug
                      ? "border-navy-800 bg-navy-800 text-white"
                      : "border-slate-200 bg-white text-navy-700 hover:border-cyan-300 hover:text-cyan-700"
                  )}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          )}

          {visible.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <EmptyState
              variant="article"
              title="No articles here yet"
              description="Try another category or check back soon — we publish regularly."
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-2 flex items-center justify-center gap-2"
            >
              {safePage > 1 && (
                <Link
                  href={buildUrl({ page: String(safePage - 1) })}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              {Array.from({ length: totalPages }).map((_, i) => (
                <Link
                  key={i}
                  href={buildUrl({ page: String(i + 1) })}
                  aria-current={safePage === i + 1 ? "page" : undefined}
                  aria-label={`Page ${i + 1}`}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                    safePage === i + 1
                      ? "border-navy-800 bg-navy-800 text-white"
                      : "border-slate-200 text-navy-700 hover:border-cyan-300 hover:text-cyan-700"
                  )}
                >
                  {i + 1}
                </Link>
              ))}
              {safePage < totalPages && (
                <Link
                  href={buildUrl({ page: String(safePage + 1) })}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-navy-700 transition-colors hover:border-cyan-300 hover:text-cyan-700"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          variant="article"
          title="News coming soon"
          description="We are writing our first articles. Check back shortly!"
        />
      )}
    </>
  );
}
