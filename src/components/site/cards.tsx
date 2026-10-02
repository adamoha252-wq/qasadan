import Link from "next/link";
import { ArrowRight, Calendar, ExternalLink, Star, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { LogoMark } from "@/components/site/logo";
import { ServiceIcon } from "@/components/site/icon";
import type {
  PublicArticle,
  PublicProject,
  PublicService,
  PublicTeamMember,
  PublicTestimonial,
} from "@/lib/data/public";

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Branded gradient placeholder used until a project photo is uploaded (Phase 6). */
export function CoverPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="bg-pixel-grid relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-t-xl bg-navy-800"
      aria-hidden="true"
    >
      <LogoMark className="h-16 w-16 text-white/90" />
      <span className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
        {label}
      </span>
    </div>
  );
}

export function ProjectCard({ project }: { project: PublicProject }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <Link href={`/portfolio/${project.slug}`} className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
        {project.coverImage ? (
           
          <img
            src={project.coverImage}
            alt={`${project.title} project cover`}
            className="aspect-[16/10] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <CoverPlaceholder label={project.category || "Project"} />
        )}
      </Link>
      <CardContent className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {project.category && (
            <Badge variant="secondary" className="bg-cyan-50 text-cyan-800">
              {project.category}
            </Badge>
          )}
          {project.isFeatured && (
            <Badge className="bg-navy-800 text-white hover:bg-navy-800">
              <Star className="mr-1 h-3 w-3" aria-hidden="true" />
              Featured
            </Badge>
          )}
        </div>
        <h3 className="font-heading text-lg font-semibold text-navy-800">
          <Link
            href={`/portfolio/${project.slug}`}
            className="transition-colors hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            {project.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{project.summary}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 border-t border-slate-100 p-6 pt-4">
        {project.completedAt ? (
          <span className="text-xs text-slate-400">Completed {formatDate(project.completedAt)}</span>
        ) : (
          <span className="text-xs text-slate-400">In development</span>
        )}
        <Link
          href={`/portfolio/${project.slug}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
        >
          View case study
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}

export function ArticleCard({ article }: { article: PublicArticle }) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-lg">
      <Link href={`/news/${article.slug}`} className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
        {article.coverImage ? (
           
          <img
            src={article.coverImage}
            alt={`${article.title} article cover`}
            className="aspect-[16/9] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="bg-pixel-grid flex aspect-[16/9] w-full items-center justify-center bg-navy-700"
            aria-hidden="true"
          >
            <LogoMark className="h-12 w-12 text-white/80" />
          </div>
        )}
      </Link>
      <CardContent className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {article.category && (
            <Badge variant="secondary" className="bg-cyan-50 text-cyan-800">
              {article.category.name}
            </Badge>
          )}
          {article.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <time dateTime={new Date(article.publishedAt).toISOString()}>
                {formatDate(article.publishedAt)}
              </time>
            </span>
          )}
        </div>
        <h3 className="font-heading text-lg font-semibold leading-snug text-navy-800">
          <Link
            href={`/news/${article.slug}`}
            className="transition-colors hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            {article.title}
          </Link>
        </h3>
        {article.excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{article.excerpt}</p>
        )}
      </CardContent>
      <CardFooter className="border-t border-slate-100 p-6 pt-4">
        <Link
          href={`/news/${article.slug}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
        >
          Read article
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}

export function ServiceCard({ service }: { service: PublicService }) {
  return (
    <Card className="flex h-full flex-col gap-4 p-6 transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
        <ServiceIcon name={service.icon} className="h-6 w-6" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-navy-800">{service.title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{service.description}</p>
      {service.features.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={`${service.title} includes`}>
          {service.features.slice(0, 5).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TeamCard({ member }: { member: PublicTeamMember }) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Card className="flex h-full flex-col items-center gap-4 p-6 text-center transition-shadow hover:shadow-md">
      {member.imageUrl ? (
         
        <img
          src={member.imageUrl}
          alt={`Portrait of ${member.name}`}
          className="h-24 w-24 rounded-full object-cover ring-4 ring-cyan-100"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-navy-800 font-heading text-2xl font-bold text-cyan-400 ring-4 ring-cyan-100"
        >
          {initials}
        </div>
      )}
      <div>
        <h3 className="font-heading text-lg font-semibold text-navy-800">{member.name}</h3>
        <p className="text-sm font-medium text-cyan-700">{member.role}</p>
      </div>
      {member.bio && <p className="text-sm leading-relaxed text-slate-600">{member.bio}</p>}
      {(member.linkedinUrl || member.twitterUrl) && (
        <div className="mt-auto flex items-center gap-3 text-xs font-semibold">
          {member.linkedinUrl && (
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 transition-colors hover:text-cyan-600"
            >
              LinkedIn
            </a>
          )}
          {member.twitterUrl && (
            <a
              href={member.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 transition-colors hover:text-cyan-600"
            >
              X / Twitter
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

export function TestimonialCard({ testimonial }: { testimonial: PublicTestimonial }) {
  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <Quote className="h-6 w-6 text-cyan-500" aria-hidden="true" />
      <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">
        “{testimonial.quote}”
      </blockquote>
      <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div>
          <p className="text-sm font-semibold text-navy-800">{testimonial.clientName}</p>
          <p className="text-xs text-slate-500">
            {[testimonial.clientRole, testimonial.company].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div
          className="flex items-center gap-0.5"
          aria-label={`Rated ${testimonial.rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${i < testimonial.rating ? "fill-cyan-500 text-cyan-500" : "text-slate-200"}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ExternalLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500"
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export { formatDate };
