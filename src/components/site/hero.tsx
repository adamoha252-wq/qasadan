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
      className="bg-hero-gradient relative flex min-h-[92vh] flex-col overflow-hidden"
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
            <span className="ab-anim inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
              <Sparkles className="ab-icon-hover h-3.5 w-3.5" aria-hidden="true" />
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
                className="btn-glow bg-brand-600 text-white transition-all hover:-translate-y-0.5 hover:bg-brand-500"
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
              {/* iPhone mockup — floats at the top right, next to the Q mark.
                  Decorative only: purely visual, pointer-events disabled. */}
              <div className="pointer-events-none absolute -top-14 -right-[3rem] w-[11rem] rotate-[4deg] select-none xl:-right-[5rem] xl:w-[13rem]">
                <div className="animate-float-slow relative">
                  {/* Ambient glow behind the device */}
                  <div className="absolute -inset-8 rounded-[4rem] bg-[radial-gradient(closest-side,rgba(6,182,212,0.32),rgba(0,102,204,0.14)_58%,transparent_80%)] blur-2xl" />
                  {/* Device body — the rotating brand ring (.ab-phone-ring) hugs this frame */}
                  <div className="ab-phone-ring relative h-[22rem] w-full rounded-[2.9rem] bg-slate-950 shadow-[0_36px_70px_-18px_rgba(2,8,20,0.65)] xl:h-[26rem]">
                    {/* Titanium rim */}
                    <div className="absolute inset-[3px] rounded-[2.65rem] bg-gradient-to-b from-slate-400 via-slate-700 to-slate-500" />
                    {/* Screen assembly */}
                    <div className="absolute inset-[5px] overflow-hidden rounded-[2.55rem] bg-navy-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_24px_rgba(0,0,0,0.45)]">
                      {/* Dynamic island */}
                      <div className="absolute left-1/2 top-[9px] z-20 h-[17px] w-14 -translate-x-1/2 rounded-full bg-black" />
                      {/* Screen canvas — brand boot screen */}
                      <div className="bg-hero-gradient relative flex h-full w-full flex-col items-center justify-center gap-4">
                        <div className="bg-pixel-grid absolute inset-0" />
                        <div className="phone-logo relative">
                          <LogoMark className="h-24 w-24 text-white" />
                        </div>
                        <div className="relative text-center">
                          <p className="font-heading text-[1.3rem] font-bold tracking-tight text-white">
                            QASADAN
                          </p>
                          <p className="mt-1.5 text-[7px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
                            Web Development Agency
                          </p>
                        </div>
                        {/* Home indicator */}
                        <div className="absolute bottom-2.5 left-1/2 h-[4px] w-24 -translate-x-1/2 rounded-full bg-white/70" />
                      </div>
                      {/* Glass reflection sweep */}
                      <div className="phone-glass" />
                    </div>
                    {/* Side buttons */}
                    <div className="absolute -left-[2.5px] top-[4.2rem] h-6 w-[3px] rounded-l-[2px] bg-slate-500" />
                    <div className="absolute -left-[2.5px] top-[6.5rem] h-11 w-[3px] rounded-l-[2px] bg-slate-500" />
                    <div className="absolute -left-[2.5px] top-[9.3rem] h-11 w-[3px] rounded-l-[2px] bg-slate-500" />
                    <div className="absolute -right-[2.5px] top-[6.8rem] h-14 w-[3px] rounded-r-[2px] bg-slate-500" />
                  </div>
                  {/* Pixel sparks breaking away (echoes the logo's pixel motif) */}
                  <div className="animate-float-slower absolute -right-3 top-10 h-2.5 w-2.5 rotate-12 rounded-[3px] bg-cyan-400/90" />
                  <div className="animate-float-slow absolute -left-4 bottom-14 h-2 w-2 -rotate-12 rounded-[2px] bg-brand-400/80 [animation-delay:1.2s]" />
                  <div className="animate-float-slower absolute -right-4 bottom-24 h-3 w-3 rotate-45 rounded-[3px] bg-cyan-300/70 [animation-delay:0.6s]" />
                </div>
              </div>
              {/* Orbiting badge chips */}
              <div className="ab-anim animate-float-slower absolute -right-4 top-6 flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-navy-900/80 px-4 py-3 backdrop-blur">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Globe className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Web · Apps · Branding</p>
                  <p className="text-xs text-navy-300">End-to-end digital services</p>
                </div>
              </div>
              <div className="ab-anim animate-float-slow absolute -left-6 bottom-8 flex items-center gap-2 rounded-2xl border border-brand-400/30 bg-navy-900/80 px-4 py-3 backdrop-blur [animation-delay:1.4s]">
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
          <span aria-hidden="true" className="ab-line absolute inset-x-0 top-0 h-[2px]" />
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
