import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Building2, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/site/rich-text";
import { CoverPlaceholder, ExternalLinkRow, formatDate } from "@/components/site/cards";
import { getPublishedProjectBySlug, getPublishedProjects } from "@/lib/data/public";

type Props = { params: Promise<{ slug: string }> };

// ISR: case studies are cached and pre-built; new/updated projects appear
// instantly after a CMS save (revalidatePath) or within 60s at most.
export const revalidate = 60;

export async function generateStaticParams() {
  const projects = await getPublishedProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) {
    return { title: "Project Not Found" };
  }
  return {
    title: `${project.title} — Case Study`,
    description: project.summary,
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: {
      title: `${project.title} | QASADAN Portfolio`,
      description: project.summary,
      type: "article",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: project.title }],
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const all = await getPublishedProjects();
  const others = all.filter((p) => p.slug !== project.slug).slice(0, 2);

  return (
    <article>
      {/* Header */}
      <header className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20">
        <div className="container-site relative flex flex-col gap-6">
          <Link
            href="/portfolio"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to portfolio
          </Link>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {project.category && (
                <Badge className="border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/10">
                  {project.category}
                </Badge>
              )}
              {project.isFeatured && (
                <Badge className="bg-cyan-500 text-navy-900 hover:bg-cyan-500">
                  Featured Project
                </Badge>
              )}
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {project.title}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-navy-200 sm:text-lg">
              {project.summary}
            </p>
          </div>
        </div>
      </header>

      {/* Meta strip */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container-site grid gap-6 py-8 sm:grid-cols-3">
          {project.client && (
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client</p>
                <p className="text-sm font-medium text-navy-800">{project.client}</p>
              </div>
            </div>
          )}
          {project.completedAt && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</p>
                <p className="text-sm font-medium text-navy-800">{formatDate(project.completedAt)}</p>
              </div>
            </div>
          )}
          {project.technologies.length > 0 && (
            <div className="flex items-start gap-3">
              <Layers className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Technologies</p>
                <p className="text-sm font-medium text-navy-800">
                  {project.technologies.join(" · ")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="bg-white py-16">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-10">
            {project.coverImage ? (
               
              <img
                src={project.coverImage}
                alt={`${project.title} cover image`}
                className="aspect-[16/9] w-full rounded-2xl object-cover"
              />
            ) : (
              <CoverPlaceholder label={project.category || "Project"} />
            )}

            {project.content && <RichText content={project.content} />}

            {project.images.length > 0 && (
              <section aria-labelledby="gallery-heading" className="flex flex-col gap-4">
                <h2 id="gallery-heading" className="font-heading text-xl font-semibold text-navy-800">
                  Gallery
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {project.images.map((img) => (
                    <figure key={img.id} className="overflow-hidden rounded-xl">
                      { }
                      <img
                        src={img.url}
                        alt={img.caption || `${project.title} — project image`}
                        className="aspect-[16/10] w-full object-cover transition-transform hover:scale-[1.02]"
                        loading="lazy"
                      />
                      {img.caption && (
                        <figcaption className="mt-2 text-xs text-slate-500">{img.caption}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6" aria-label="Project details">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="font-heading text-base font-semibold text-navy-800">
                Project details
              </h2>
              <dl className="mt-4 flex flex-col gap-3 text-sm">
                {project.client && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Client</dt>
                    <dd className="text-right font-medium text-navy-800">{project.client}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Category</dt>
                  <dd className="text-right font-medium text-navy-800">
                    {project.category || "—"}
                  </dd>
                </div>
                {project.completedAt && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Completed</dt>
                    <dd className="text-right font-medium text-navy-800">
                      {formatDate(project.completedAt)}
                    </dd>
                  </div>
                )}
              </dl>
              {project.externalUrl && (
                <div className="mt-5 border-t border-slate-200 pt-5">
                <ExternalLinkRow label="Visit live project" href={project.externalUrl} />
                </div>
              )}
            </div>

            <div className="bg-pixel-grid rounded-2xl bg-navy-800 p-6">
              <h2 className="font-heading text-base font-semibold text-white">
                Like this project?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-navy-200">
                We would love to build something similar for your organization.
              </p>
              <Button asChild className="mt-4 w-full bg-cyan-500 text-navy-900 hover:bg-cyan-400">
                <Link href="/contact" className="inline-flex items-center justify-center gap-2">
                  Start a Project
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* More projects */}
      {others.length > 0 && (
        <section aria-labelledby="more-projects" className="border-t border-slate-200 bg-slate-50 py-16">
          <div className="container-site flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <h2 id="more-projects" className="font-heading text-2xl font-bold text-navy-800">
                More projects
              </h2>
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:text-cyan-700"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {others.map((p) => (
                <Link
                  key={p.id}
                  href={`/portfolio/${p.slug}`}
                  className="group flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                >
                  <div className="min-w-0 flex-1">
                    {p.category && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
                        {p.category}
                      </p>
                    )}
                    <h3 className="mt-1 font-heading text-lg font-semibold text-navy-800 group-hover:text-cyan-700">
                      {p.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.summary}</p>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-cyan-600"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
