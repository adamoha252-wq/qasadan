import type { Metadata } from "next";
import Link from "next/link";
import { Compass, MessagesSquare, Code2, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { TeamCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { getActiveTeamMembers } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Who We Are",
  description:
    "Meet the QASADAN team — designers, engineers, and strategists in Mogadishu delivering world-class digital products, and the culture and process behind our work.",
  alternates: { canonical: "/who-we-are" },
};

const approach = [
  {
    icon: Compass,
    step: "01",
    title: "Discover",
    description:
      "We start by listening — understanding your organization, your users, and the outcome that defines success. No assumptions, no cookie-cutter briefs.",
  },
  {
    icon: MessagesSquare,
    step: "02",
    title: "Design & align",
    description:
      "Wireframes and prototypes are shared early and often. You see and shape the product before a single production line is written.",
  },
  {
    icon: Code2,
    step: "03",
    title: "Build & test",
    description:
      "Iterative development in weekly increments, with real-device QA in our Digital Lab — from budget Android phones to desktops.",
  },
  {
    icon: Heart,
    step: "04",
    title: "Launch & grow",
    description:
      "We ship, train your team, and stay on as your product grows. Most of our clients have been with us for years, not weeks.",
  },
];

const culture = [
  {
    title: "A teaching studio",
    description:
      "Every senior at QASADAN mentors juniors through our Digital Lab programme. We grow the next generation of Somali technologists while we build.",
  },
  {
    title: "Local roots, global standards",
    description:
      "We work in English, Somali, and Arabic; we design for 3G networks and budget devices; and we hold ourselves to international engineering benchmarks.",
  },
  {
    title: "Healthy by default",
    description:
      "Sustainable pace, honest estimates, and no hero culture. Well-rested teams write better software — our quality record proves it.",
  },
];

export default async function WhoWeArePage() {
  const team = await getActiveTeamMembers();

  return (
    <>
      {/* Hero */}
      <section className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20" aria-labelledby="wwa-hero">
        <div className="container-site relative flex flex-col items-center gap-6 text-center">
          <h1
            id="wwa-hero"
            className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            Who We Are
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            A close-knit team of designers, engineers, and strategists — united by the
            belief that the best digital products are built by people who genuinely
            care about the outcome.
          </p>
        </div>
      </section>

      {/* Team */}
      <section aria-labelledby="team-heading" className="bg-white py-20">
        <div className="container-site flex flex-col gap-12">
          <SectionHeading
            eyebrow="The Team"
            title="People behind the pixels"
            description="Small enough to care about every detail, senior enough to own every outcome."
          />
          {team.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => (
                <TeamCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <EmptyState
              variant="service"
              title="Team coming soon"
              description="Our team profiles are being updated. Check back shortly."
            />
          )}
        </div>
      </section>

      {/* How we work */}
      <section aria-labelledby="approach-heading" className="bg-slate-50 py-20">
        <div className="container-site flex flex-col gap-12">
          <SectionHeading
            eyebrow="How We Work"
            title="A process refined over 50+ projects"
            description="Predictable where it matters, flexible where it counts."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {approach.map((step) => (
              <div
                key={step.step}
                className="relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6"
              >
                <span
                  className="absolute right-5 top-4 font-heading text-3xl font-bold text-slate-100"
                  aria-hidden="true"
                >
                  {step.step}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-navy-800">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture */}
      <section aria-labelledby="culture-heading" className="bg-white py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <SectionHeading
            align="left"
            eyebrow="Our Culture"
            title="More than a job title"
            description="The environment we have built shapes the work you receive. Here is what it is like inside QASADAN."
          />
          <div className="flex flex-col gap-6">
            {culture.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-heading text-lg font-semibold text-navy-800">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section aria-labelledby="wwa-cta" className="bg-slate-50 py-20">
        <div className="container-site flex flex-col items-center gap-6 text-center">
          <h2 id="wwa-cta" className="font-heading text-3xl font-bold tracking-tight text-navy-800">
            Sound like your kind of team?
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-slate-600">
            Whether you have a fully-formed brief or just an idea worth exploring, we
            would love to hear it.
          </p>
          <Button asChild size="lg" className="bg-cyan-500 text-navy-900 hover:bg-cyan-400">
            <Link href="/contact" className="inline-flex items-center gap-2">
              Start the conversation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
