import Link from "next/link";
import { ArrowRight, Globe, Smartphone, PenTool, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { LogoMark } from "@/components/site/logo";

const stats = [
  { value: "50+", label: "Projects Delivered" },
  { value: "40+", label: "Happy Clients" },
  { value: "6+", label: "Years of Experience" },
  { value: "24/7", label: "Support & Maintenance" },
];

const services = [
  {
    icon: Code2,
    title: "Web Development",
    description:
      "Fast, secure, and scalable websites built with modern technologies that convert visitors into customers.",
  },
  {
    icon: Smartphone,
    title: "Web Applications",
    description:
      "Powerful custom web applications — from client portals to management systems — tailored to your workflow.",
  },
  {
    icon: PenTool,
    title: "UI/UX Design",
    description:
      "Beautiful, intuitive interfaces designed around your users, grounded in research and best practices.",
  },
];

export default function Home() {
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
              <Button
                asChild
                size="lg"
                className="bg-cyan-500 text-navy-900 hover:bg-cyan-400"
              >
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

      {/* Services preview */}
      <section aria-labelledby="services-heading" className="bg-slate-50 py-20">
        <div className="container-site flex flex-col gap-12">
          <SectionHeading
            eyebrow="What We Do"
            title="Services built for growth"
            description="From your first landing page to complex enterprise platforms, we deliver end-to-end digital services that move your organization forward."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <service.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-navy-800">
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {service.description}
                </p>
                <Link
                  href="/services"
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-500"
                >
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

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
            <Button
              asChild
              size="lg"
              className="mt-8 bg-cyan-500 text-navy-900 hover:bg-cyan-400"
            >
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
