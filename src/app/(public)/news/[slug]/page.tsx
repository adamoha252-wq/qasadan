import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/site/rich-text";
import { ArticleCard, formatDate } from "@/components/site/cards";
import {
  getPublishedArticleBySlug,
  getPublishedArticles,
} from "@/lib/data/public";

type Props = { params: Promise<{ slug: string }> };

// CMS-driven content must always reflect the database
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    return { title: "Article Not Found" };
  }
  return {
    title: article.title,
    description: article.excerpt || article.title,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      title: `${article.title} | QASADAN News`,
      description: article.excerpt || article.title,
      type: "article",
      ...(article.publishedAt && { publishedTime: new Date(article.publishedAt).toISOString() }),
    },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const all = await getPublishedArticles();
  const related = all
    .filter((a) => a.slug !== article.slug)
    .filter((a) => !article.category || a.category?.id === article.category.id)
    .slice(0, 3);
  const fallback = all.filter((a) => a.slug !== article.slug).slice(0, 3);
  const suggestions = related.length > 0 ? related : fallback;

  return (
    <article>
      {/* Header */}
      <header className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20">
        <div className="container-site relative flex max-w-4xl flex-col items-start gap-6">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to news
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {article.category && (
              <Badge className="border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/10">
                <Tag className="mr-1 h-3 w-3" aria-hidden="true" />
                {article.category.name}
              </Badge>
            )}
            {article.publishedAt && (
              <span className="inline-flex items-center gap-1.5 text-xs text-navy-300">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <time dateTime={new Date(article.publishedAt).toISOString()}>
                  {formatDate(article.publishedAt)}
                </time>
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-base leading-relaxed text-navy-200 sm:text-lg">
              {article.excerpt}
            </p>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="bg-white py-16">
        <div className="container-site flex max-w-4xl flex-col gap-10">
          {article.coverImage ? (
             
            <img
              src={article.coverImage}
              alt={`${article.title} cover image`}
              className="aspect-[16/8] w-full rounded-2xl object-cover"
            />
          ) : (
            <div
              className="bg-pixel-grid flex aspect-[16/8] w-full items-center justify-center rounded-2xl bg-navy-700"
              aria-hidden="true"
            />
          )}

          {article.content && <RichText content={article.content} />}

          {/* Article footer CTA */}
          <div className="bg-pixel-grid rounded-2xl bg-navy-800 p-8 text-center">
            <h2 className="font-heading text-xl font-bold text-white">
              Need help applying this to your organization?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-navy-200">
              Our team is one message away — book a free consultation and let us talk
              about your digital goals.
            </p>
            <Button asChild className="mt-6 bg-cyan-500 text-navy-900 hover:bg-cyan-400">
              <Link href="/contact" className="inline-flex items-center gap-2">
                Get in Touch
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Related articles */}
      {suggestions.length > 0 && (
        <section aria-labelledby="related-articles" className="border-t border-slate-200 bg-slate-50 py-16">
          <div className="container-site flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <h2 id="related-articles" className="font-heading text-2xl font-bold text-navy-800">
                {related.length > 0 ? "More in this topic" : "More articles"}
              </h2>
              <Link
                href="/news"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {suggestions.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
