import type { Metadata } from "next";
import Link from "next/link";
import { Target, Eye, HeartHandshake, Lightbulb, ShieldCheck, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { LogoMark } from "@/components/site/logo";
import { TestimonialCard } from "@/components/site/cards";
import { getPublishedTestimonials } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about QASADAN — a Mogadishu-based web development agency on a mission to build Africa's digital future, one exceptional product at a time.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: Lightbulb,
    title: "Craft over shortcuts",
    description:
      "We believe quality is non-negotiable. Every line of code, every pixel, and every interaction is deliberate — because your reputation deserves nothing less.",
  },
  {
    icon: HeartHandshake,
    title: "Partnership over transactions",
    description:
      "We succeed when you succeed. That is why most of our work comes from repeat clients and referrals — we treat your project like our own product.",
  },
  {
    icon: ShieldCheck,
    title: "Trust through transparency",
    description:
      "Clear timelines, honest pricing, and open communication. You will always know exactly where your project stands and what happens next.",
  },
  {
    icon: Rocket,
    title: "Growth minded",
    description:
      "We build for where you are going, not just where you are. Scalable architecture and maintainable code are standard on every engagement.",
  },
];

const milestones = [
  {
    year: "2020",
    title: "QASADAN is founded",
    description:
      "Started as a two-person studio in Mogadishu with a single conviction: world-class digital work can be made in Somalia.",
  },
  {
    year: "2022",
    title: "First institutional client",
    description:
      "Delivered our first large-scale institutional website, establishing QASADAN as a trusted partner for NGOs and schools.",
  },
  {
    year: "2024",
    title: "Team expands to 10+",
    description:
      "Grew our design, engineering, and support teams and formalized our junior mentorship programme.",
  },
  {
    year: "2026",
    title: "New Digital Lab opens",
    description:
      "Opened our dedicated Digital Lab — usability testing, QA, and training under one roof.",
  },
];

// CMS-driven content must always reflect the database
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const testimonials = await getPublishedTestimonials();

  return (
    <>
      {/* Page hero */}
      <section className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20" aria-labelledby="about-hero">
        <div className="container-site relative flex flex-col items-center gap-6 text-center">
          <LogoMark className="h-16 w-16 text-white" aria-hidden="true" />
          <h1
            id="about-hero"
            className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            About QASADAN
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            We are a team of designers, engineers, and strategists building the digital
            face of East African organizations — and proving every day that world-class
            technology is made here.
          </p>
        </div>
      </section>

      {/* Story */}
      <section aria-labelledby="story-heading" className="bg-white py-20">
        <div className="container-site grid items-start gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <SectionHeading align="left" eyebrow="Our Story" title="Built in Mogadishu, for the world" as="h2" />
            <div className="flex flex-col gap-4 text-base leading-relaxed text-slate-600">
              <p>
                QASADAN began in 2020 with a simple frustration: talented organizations across
                the Horn of Africa were being underserved by the digital industry. Schools
                ran on paper notices, research institutes were invisible online, and
                businesses lost customers to competitors with nothing more than a decent
                website.
              </p>
              <p>
                Our founders — a designer and an engineer — set out to close that gap. Not by
                importing generic templates, but by building a genuine product studio rooted
                in the region: one that understands local realities like mobile-first
                audiences, intermittent connectivity, and multilingual communities, while
                delivering to international standards.
              </p>
              <p>
                Today, QASADAN has delivered over fifty digital projects for schools, NGOs,
                startups, and enterprises. Every one of them shares the same foundation:
                rigorous engineering, honest design, and a partnership mindset that keeps
                clients coming back.
              </p>
            </div>
          </div>

          {/* Mission & vision cards */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-navy-900">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-navy-800">Our Mission</h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                To empower East African organizations with digital products of global
                standard — accessible, fast, and built to grow — so that geography is
                never a barrier to opportunity.
              </p>
            </div>
            <div className="rounded-2xl border border-navy-100 bg-navy-50 p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-cyan-400">
                  <Eye className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-navy-800">Our Vision</h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                A Horn of Africa where every school, business, and institution operates
                at full digital potential — with QASADAN as the engine behind thousands
                of those success stories.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-heading" className="bg-slate-50 py-20">
        <div className="container-site flex flex-col gap-12">
          <SectionHeading
            eyebrow="Our Values"
            title="The principles behind every project"
            description="Values are only real if they change how you work. These four shape every decision we make."
          />
          <div className="grid gap-6 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <value.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-navy-800">{value.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section aria-labelledby="timeline-heading" className="bg-white py-20">
        <div className="container-site flex flex-col gap-12">
          <SectionHeading
            eyebrow="Our Journey"
            title="Milestones along the way"
          />
          <ol className="relative mx-auto flex max-w-2xl flex-col gap-10 border-l-2 border-cyan-200 pl-8">
            {milestones.map((m) => (
              <li key={m.year} className="relative">
                <span
                  className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-cyan-500 bg-white"
                  aria-hidden="true"
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                </span>
                <p className="font-heading text-sm font-bold uppercase tracking-widest text-cyan-600">
                  {m.year}
                </p>
                <h3 className="mt-1 font-heading text-lg font-semibold text-navy-800">{m.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{m.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonial strip */}
      {testimonials.length > 0 && (
        <section aria-labelledby="about-testimonials" className="bg-slate-50 py-20">
          <div className="container-site flex flex-col gap-12">
            <SectionHeading eyebrow="Client Voices" title="Trusted by organizations we admire" />
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.slice(0, 3).map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section aria-labelledby="about-cta" className="bg-white py-20">
        <div className="container-site flex flex-col items-center gap-6 text-center">
          <h2 id="about-cta" className="font-heading text-3xl font-bold tracking-tight text-navy-800">
            Want to work with us?
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-slate-600">
            Meet the people behind the work on our Who We Are page, or jump straight in
            and tell us about your project.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="bg-navy-800 text-white hover:bg-navy-700">
              <Link href="/contact" className="inline-flex items-center gap-2">
                Start a Project
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-navy-200 text-navy-800 hover:bg-navy-50">
              <Link href="/who-we-are">Meet the Team</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
