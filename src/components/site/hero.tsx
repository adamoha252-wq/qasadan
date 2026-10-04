import { ArrowRight, Globe, CheckCircle2, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/logo";
import { Reveal, AnimatedCounter } from "@/components/site/reveal";
import type { PublicSiteStat } from "@/lib/data/public";

/**
 * Full-screen gradient hero — deep navy → royal blue, animated stats band
 * fed from the admin-editable SiteStat table.
 */
export function Hero({ stats }: { stats: PublicSiteStat[] }) {
  return (
    <section
      className="bg-hero-gradient relative flex min-h-[92vh] items-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Decorative layers */}
      <div className="bg-pixel-grid absolute inset-0" aria-hidden="true" />
      <div
        className="animate-float-slow absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-brand-600/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="animate-float-slower absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute right-[12%] top-[18%] hidden h-20 w-20 rounded-ss-3xl border-l-2 border-t-2 border-cyan-400/40 lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[14%] left-[8%] hidden h-14 w-14 rounded-se-3xl border-b-2 border-r-2 border-brand-400/40 lg:block"
        aria-hidden="true"
      />

      <div className="container-site relative grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        {/* Copy column */}
        <div className="flex flex-col items-start gap-6">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              East Africa&apos;s Digital Partner
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1
              id="hero-heading"
              className="font-heading text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              We build websites that{" "}
              <span className="text-gradient-cyan">grow your business</span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">
              QASADAN is a full-service web development agency crafting high-performance
              websites, web applications, and digital products for organizations across
              East Africa and beyond.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition-all hover:-translate-y-0.5 hover:bg-brand-500"
              >
                <a href="/services" className="inline-flex items-center gap-2">
                  Explore Services
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-navy-400/60 bg-white/5 text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
              >
                <a href="/portfolio" className="inline-flex items-center gap-2">
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  View Portfolio
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={400}>
            <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-200">
              {["Free consultation", "Transparent pricing", "Post-launch support"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </Reveal>
        </div>

        {/* Visual column */}
        <div className="relative hidden justify-center lg:flex" aria-hidden="true">
          <Reveal variant="zoom" delay={250}>
            <div className="relative">
              <div className="animate-float-slow flex items-center justify-center">
                <LogoMark className="h-72 w-72 text-white drop-shadow-2xl" />
              </div>
              {/* Orbiting badge chips */}
              <div className="animate-float-slower absolute -right-4 top-6 flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-navy-900/80 px-4 py-3 backdrop-blur">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Globe className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Web · Apps · Branding</p>
                  <p className="text-xs text-navy-300">End-to-end digital services</p>
                </div>
              </div>
              <div className="animate-float-slow absolute -left-6 bottom-8 flex items-center gap-2 rounded-2xl border border-brand-400/30 bg-navy-900/80 px-4 py-3 backdrop-blur [animation-delay:1.4s]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">24/7 Support</p>
                  <p className="text-xs text-navy-300">We are always online</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Stats band (admin-editable via /admin/site-stats) */}
      {stats.length > 0 && (
        <div className="relative border-t border-white/10 bg-navy-950/40 backdrop-blur">
          <div className="container-site grid grid-cols-2 gap-6 py-8 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <Reveal key={stat.id} delay={i * 100} className="text-center">
                <p className="font-heading text-3xl font-bold text-white sm:text-4xl">
                  <AnimatedCounter value={stat.value} />
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-navy-300">
                  {stat.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
