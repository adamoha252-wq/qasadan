import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Globe, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { LogoMark } from "@/components/site/logo";
import {
  ProjectCard,
  ArticleCard,
  ServiceCard,
  TestimonialCard,
} from "@/components/site/cards";
import {
  getPublishedServices,
  getFeaturedProjects,
  getPublishedArticles,
  getPublishedTestimonials,
} from "@/lib/data/public";

export const metadata: Metadata = {
  title: "QASADAN — Web Development Agency",
  description:
    "QASADAN is a full-service web development agency crafting high-performance websites, web applications, and digital products for organizations across East Africa and beyond.",
  alternates: { canonical: "/" },
};

const stats = [
  { value: "50+", label: "Projects Delivered" },
  { value: "40+", label: "Happy Clients" },
  { value: "6+", label: "Years of Experience" },
  { value: "24/7", label: "Support & Maintenance" },
];

export default async function HomePage() {
  const [services, featuredProjects, articles, testimonials] = await Promise.all([
    getPublishedServices(),
    getFeaturedProjects(2),
    getPublishedArticles(2),
    getPublishedTestimonials(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-800" aria-labelledby="hero-heading">
        <div className="bg-pixel-grid absolute inset-0" aria-hidden="true" />
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="container-site relative grid items-center gap-10 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              Web Development Agency
            </span>
            <h1
              id="hero-heading"
              className="font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Digital solutions engineered for{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent">
                impact
              </span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">
              QASADAN is a full-service web development agency crafting high-performance
              websites, web applications, and digital products for organizations across
              East Africa and beyond.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-cyan-500 text-navy-900 hover:bg-cyan-400">
                <a href="/portfolio" className="inline-flex items-center gap-2">
                  View Our Work
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-navy-400 bg-transparent text-white hover:bg-navy-700 hover:text-white"
              >
                <a href="/contact">Start a Project</a>
              </Button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-200">
              {["Free consultation", "Transparent pricing", "Post-launch support"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden justify-center lg:flex" aria-hidden="true">
            <LogoMark className="h-80 w-80 text-white drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Agency statistics" className="border-b border-slate-200 bg-white">
        <div className="container-site grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 text-center">
              <span className="font-heading text-3xl font-bold text-navy-800 sm:text-4xl">
                {stat.value}
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured projects */}
      <section aria-labelledby="featured-heading" className="bg-white py-20">
        <div className="container-site flex flex-col gap-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              align="left"
              eyebrow="Our Work"
              title="Featured projects"
              description="A selection of recent engagements — from institutional websites to custom platforms."
              className="max-w-2xl"
            />
            <Link
              href="/portfolio"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
            >
              All projects
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {featuredProjects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Featured projects coming soon.</p>
          )}
        </div>
      </section>

      {/* Services */}
      <section aria-labelledby="services-heading" className="bg-slate-50 py-20">
        <div className="container-site flex flex-col gap-12">
          <SectionHeading
            eyebrow="What We Do"
            title="Services built for growth"
            description="From your first landing page to complex enterprise platforms, we deliver end-to-end digital services that move your organization forward."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
          <div className="flex justify-center">
            <Button asChild variant="outline" className="border-navy-200 text-navy-800 hover:bg-navy-50">
              <a href="/services" className="inline-flex items-center gap-2">
                Explore all services
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section aria-labelledby="testimonials-heading" className="bg-white py-20">
          <div className="container-site flex flex-col gap-12">
            <SectionHeading
              eyebrow="Client Voices"
              title="What our clients say"
              description="We measure success by the outcomes our clients achieve."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.slice(0, 3).map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest news */}
      {articles.length > 0 && (
        <section aria-labelledby="news-heading" className="bg-slate-50 py-20">
          <div className="container-site flex flex-col gap-12">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeading
                align="left"
                eyebrow="News & Insights"
                title="From the QASADAN blog"
                className="max-w-2xl"
              />
              <Link
                href="/news"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
              >
                All articles
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA band */}
      <section aria-labelledby="cta-heading" className="bg-white py-20">
        <div className="container-site">
          <div className="bg-pixel-grid relative overflow-hidden rounded-3xl bg-navy-800 px-6 py-14 text-center sm:px-12">
            <h2
              id="cta-heading"
              className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Have a project in mind?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-navy-200">
              Tell us about your goals and we will craft a digital solution that fits
              your needs, timeline, and budget.
            </p>
            <Button asChild size="lg" className="mt-8 bg-cyan-500 text-navy-900 hover:bg-cyan-400">
              <a href="/contact" className="inline-flex items-center gap-2">
                Get in Touch
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
