import Link from "next/link";
import {
  ArrowRight,
  Target,
  Eye,
  HeartHandshake,
  ShieldCheck,
  Lightbulb,
  Handshake,
  Award,
  Check,
  ExternalLink,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { ServiceIcon } from "@/components/site/icon";
import { siteConfig } from "@/lib/site";
import type {
  PublicService,
  PublicTeamMember,
  PublicPricingPlan,
  PublicPartner,
} from "@/lib/data/public";

/* ============================================================
 * MISSION / VISION / VALUES — light band
 * ============================================================ */

const pillars = [
  {
    icon: Target,
    title: "Our Mission",
    body: "To empower organizations across East Africa with fast, secure, and beautiful digital products that unlock growth and serve their communities better.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    body: "To be the region's most trusted web development partner — the first name organizations think of when they need reliable technology that works.",
  },
  {
    icon: HeartHandshake,
    title: "Our Promise",
    body: "Honest communication, transparent pricing, and long-term support. We treat every project like it carries our own name — because it does.",
  },
];

const values = [
  { icon: ShieldCheck, label: "Integrity" },
  { icon: Lightbulb, label: "Innovation" },
  { icon: Handshake, label: "Partnership" },
  { icon: Award, label: "Excellence" },
];

export function MissionValues() {
  return (
    <section aria-labelledby="mission-heading" className="bg-light-band py-20 lg:py-24">
      <div className="container-site flex flex-col gap-12">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Who We Are"
            title="Driving East Africa's digital future"
            description="A team of engineers, designers, and strategists building technology that creates real impact for organizations and the people they serve."
          />
        </Reveal>

        <Reveal stagger className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="card-lift h-full border-navy-100 bg-white/80 backdrop-blur">
              <CardContent className="flex flex-col gap-4 p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-lg shadow-brand-600/25">
                  <pillar.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="font-heading text-xl font-semibold text-navy-800">
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">{pillar.body}</p>
              </CardContent>
            </Card>
          ))}
        </Reveal>

        <Reveal delay={150}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {values.map((value) => (
              <span
                key={value.label}
                className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-sm transition-transform hover:scale-105"
              >
                <value.icon className="h-4 w-4 text-cyan-600" aria-hidden="true" />
                {value.label}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200} className="flex justify-center">
          <Button asChild variant="outline" className="border-brand-200 text-brand-700 hover:bg-brand-50">
            <Link href="/who-we-are" className="inline-flex items-center gap-2">
              More about who we are
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
 * SERVICES — dark band with glowing icon cards
 * ============================================================ */

export function ServicesDark({ services }: { services: PublicService[] }) {
  return (
    <section aria-labelledby="services-heading" className="bg-dark-band relative overflow-hidden py-20 lg:py-24">
      <div className="bg-pixel-grid absolute inset-0" aria-hidden="true" />
      <div
        className="animate-float-slow absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-brand-600/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="container-site relative flex flex-col gap-12">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              What We Do
            </span>
            <h2
              id="services-heading"
              className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Comprehensive digital services
            </h2>
            <p className="mt-4 text-base leading-relaxed text-navy-300">
              From your first landing page to complex enterprise platforms — everything
              you need to win online, delivered by one dedicated team.
            </p>
          </div>
        </Reveal>

        <Reveal stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((service) => (
            <div
              key={service.id}
              className="group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-400/40 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-cyan-500/10"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-brand-600/20 text-cyan-300 ring-1 ring-cyan-400/30 transition-transform duration-300 group-hover:scale-110">
                <ServiceIcon name={service.icon} className="h-6 w-6" />
              </span>
              <h3 className="font-heading text-lg font-semibold text-white">
                {service.title}
              </h3>
              <p className="text-sm leading-relaxed text-navy-300">{service.description}</p>
              <Link
                href="/services"
                className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
              >
                Learn more
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          ))}
        </Reveal>

        <Reveal delay={150} className="flex justify-center">
          <Button
            asChild
            size="lg"
            className="bg-cyan-500 text-navy-900 shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:bg-cyan-400"
          >
            <Link href="/services" className="inline-flex items-center gap-2">
              Explore all services
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
 * TEAM — numbered profile cards (01, 02, …)
 * ============================================================ */

export function TeamShowcase({ members }: { members: PublicTeamMember[] }) {
  return (
    <section aria-labelledby="team-heading" className="bg-gradient-to-b from-white via-navy-50 to-white py-20 lg:py-24">
      <div className="container-site flex flex-col gap-12">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Our People"
            title="Meet the team behind QASADAN"
            description="Engineers, designers, and strategists dedicated to your success — every project gets senior attention from day one."
          />
        </Reveal>

        <Reveal stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.slice(0, 6).map((member, i) => {
            const initials = member.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <Card key={member.id} className="card-lift group relative h-full overflow-hidden">
                <span
                  className="pointer-events-none absolute -right-2 -top-4 select-none font-heading text-7xl font-bold text-navy-50 transition-colors group-hover:text-cyan-100"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <CardContent className="relative flex flex-col items-center gap-3 p-8 text-center">
                  {member.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={`Portrait of ${member.name}`}
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-cyan-100 transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-brand-700 font-heading text-2xl font-bold text-cyan-400 ring-4 ring-cyan-100 transition-transform duration-300 group-hover:scale-105"
                    >
                      {initials}
                    </span>
                  )}
                  <h3 className="font-heading text-lg font-semibold text-navy-800">
                    {member.name}
                  </h3>
                  <p className="text-sm font-medium text-brand-600">{member.role}</p>
                  {member.bio && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {member.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Join CTA tile */}
          <Card className="card-lift h-full border-dashed border-brand-200 bg-brand-50/50">
            <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow">
                <Handshake className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="font-heading text-lg font-semibold text-navy-800">
                Work with us
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                We are always looking for talented developers and designers in East
                Africa to grow with us.
              </p>
              <Button asChild variant="outline" size="sm" className="border-brand-300 text-brand-700 hover:bg-brand-100">
                <Link href="/contact">Get in touch</Link>
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
 * PRICING — admin-editable plans
 * ============================================================ */

const trustBadges = [
  { label: "Free Consultation" },
  { label: "No Hidden Fees" },
  { label: "24/7 Support" },
  { label: "100% Satisfaction" },
];

export function PricingSection({ plans }: { plans: PublicPricingPlan[] }) {
  if (plans.length === 0) return null;
  return (
    <section
      aria-labelledby="pricing-heading"
      className="bg-gradient-to-b from-white via-brand-50/40 to-white py-20 lg:py-24"
    >
      <div className="container-site flex flex-col gap-12">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Our Pricing"
            title="Choose the plan that fits your business"
            description="Transparent pricing for every stage of your digital journey — from your first website to enterprise-scale platforms. No hidden fees, ever."
          />
        </Reveal>

        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 120} className="h-full">
              {plan.isFeatured ? (
                <div className="relative h-full rounded-3xl bg-gradient-to-b from-brand-600 to-navy-800 p-[1.5px] shadow-2xl shadow-brand-600/25 lg:-mt-4 lg:mb-4">
                  <span className="animate-shimmer absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-brand-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                    Most Popular
                  </span>
                  <PricingPlanBody plan={plan} dark />
                </div>
              ) : (
                <div className="card-lift h-full rounded-3xl border border-navy-100 bg-white">
                  <PricingPlanBody plan={plan} />
                </div>
              )}
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustBadges.map((badge) => (
              <li
                key={badge.label}
                className="flex items-center gap-2 text-sm font-medium text-slate-600"
              >
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                {badge.label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function PricingPlanBody({
  plan,
  dark = false,
}: {
  plan: PublicPricingPlan;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col gap-6 rounded-3xl p-8 ${
        dark ? "bg-navy-900" : "bg-white"
      }`}
    >
      <div>
        <h3
          className={`font-heading text-xl font-semibold ${dark ? "text-white" : "text-navy-800"}`}
        >
          {plan.name}
        </h3>
        {plan.tagline && (
          <p className={`mt-1 text-sm ${dark ? "text-navy-300" : "text-slate-500"}`}>
            {plan.tagline}
          </p>
        )}
      </div>
      <p className="flex items-end gap-2">
        <span
          className={`font-heading text-4xl font-bold ${dark ? "text-white" : "text-navy-800"}`}
        >
          <AnimatedPrice value={plan.price} />
        </span>
        <span className={`pb-1 text-sm ${dark ? "text-navy-300" : "text-slate-500"}`}>
          / {plan.period}
        </span>
      </p>
      <ul className="flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={`flex items-start gap-2.5 text-sm ${
              dark ? "text-navy-200" : "text-slate-600"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
                dark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-50 text-cyan-600"
              }`}
            >
              <Check className="h-3 w-3" aria-hidden="true" />
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <Button
        asChild
        size="lg"
        className={
          plan.isFeatured
            ? "w-full bg-cyan-500 text-navy-900 shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 hover:bg-cyan-400"
            : "w-full border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
        }
        variant={plan.isFeatured ? "default" : "outline"}
      >
        <Link href="/contact">{plan.ctaLabel}</Link>
      </Button>
    </div>
  );
}

function AnimatedPrice({ value }: { value: string }) {
  // Simple static render — the hero stats carry the counter animation;
  // keeping prices static avoids layout shift on the money line.
  return <>{value}</>;
}

/* ============================================================
 * PARTNERS — trusted-by grid (admin-editable)
 * ============================================================ */

export function PartnersSection({ partners }: { partners: PublicPartner[] }) {
  if (partners.length === 0) return null;
  return (
    <section aria-labelledby="partners-heading" className="bg-white py-20 lg:py-24">
      <div className="container-site flex flex-col gap-12">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Trusted By"
            title="Organizations that rely on QASADAN"
            description="NGOs, schools, and businesses across the region trust us with their digital presence — and stay with us for the long run."
          />
        </Reveal>

        <Reveal stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {partners.map((partner) => {
            const initials = partner.name
              .replace(/[^a-zA-Z\s]/g, "")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            return (
              <Card key={partner.id} className="card-lift h-full">
                <CardContent className="flex h-full flex-col items-center gap-3 p-6 text-center">
                  {partner.logoUrl ? (
                    <img
                      src={partner.logoUrl}
                      alt={`${partner.name} logo`}
                      className="h-14 w-14 rounded-xl object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-navy-800 to-brand-700 font-heading text-lg font-bold text-cyan-400"
                    >
                      {initials || "Q"}
                    </span>
                  )}
                  <h3 className="font-heading text-sm font-semibold leading-snug text-navy-800">
                    {partner.name}
                  </h3>
                  {partner.category && (
                    <Badge variant="secondary" className="bg-brand-50 text-brand-700">
                      {partner.category}
                    </Badge>
                  )}
                  {partner.websiteUrl && (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
                    >
                      Visit website
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
 * CONTACT CTA — quick-action cards + gradient band
 * ============================================================ */

export function ContactCTA() {
  const cards = [
    {
      icon: Phone,
      title: "Call Us",
      line1: siteConfig.phone,
      line2: "Sat – Thu, 8am – 6pm",
      href: `tel:${siteConfig.phoneHref}`,
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      line1: siteConfig.phone,
      line2: "Quick response guaranteed",
      href: siteConfig.whatsappHref,
    },
    {
      icon: Mail,
      title: "Email",
      line1: siteConfig.email,
      line2: "We reply within 24 hours",
      href: `mailto:${siteConfig.email}`,
    },
    {
      icon: MapPin,
      title: "Visit Us",
      line1: siteConfig.address,
      line2: "Also serving clients worldwide",
      href: "/contact",
    },
  ];

  return (
    <section aria-labelledby="contact-cta-heading" className="bg-light-band py-20 lg:py-24">
      <div className="container-site flex flex-col gap-12">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Get In Touch"
            title="Let's discuss your project"
            description="Have an idea in mind? We're ready to help. Reach out and let's build something amazing together."
          />
        </Reveal>

        <Reveal stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="card-lift group flex flex-col items-center gap-2 rounded-2xl border border-navy-100 bg-white p-6 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-all group-hover:bg-brand-600 group-hover:text-white">
                <card.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="font-heading text-base font-semibold text-navy-800">
                {card.title}
              </h3>
              <p className="text-sm font-medium text-slate-700">{card.line1}</p>
              <p className="text-xs text-slate-400">{card.line2}</p>
            </a>
          ))}
        </Reveal>

        <Reveal delay={150}>
          <div className="bg-pixel-grid relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-brand-800 px-6 py-14 text-center sm:px-12">
            <div
              className="animate-float-slow absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl"
              aria-hidden="true"
            />
            <h2
              id="contact-cta-heading"
              className="relative font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Ready to start your project?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-navy-200">
              Tell us about your goals and we'll craft a digital solution that fits your
              needs, timeline, and budget — with a free consultation to get started.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-cyan-500 text-navy-900 shadow-lg shadow-cyan-500/25 transition-all hover:-translate-y-0.5 hover:bg-cyan-400"
              >
                <Link href="/contact" className="inline-flex items-center gap-2">
                  Start a Project
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <a
                href={siteConfig.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:brightness-110"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
