import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";
import { ServiceCard } from "@/components/site/cards";
import { EmptyState } from "@/components/site/empty-state";
import { getPublishedServices, getPublicSettings } from "@/lib/data/public";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web development, web applications, UI/UX design, branding, SEO, and maintenance — explore QASADAN's full-service digital offering for organizations in East Africa and beyond.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([
    getPublishedServices(),
    getPublicSettings(),
  ]);
  const email = settings["contact.email"] || siteConfig.email;
  const phone = settings["contact.phone"] || siteConfig.phone;

  return (
    <>
      {/* Hero */}
      <section className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20" aria-labelledby="services-hero">
        <div className="container-site relative flex flex-col items-center gap-6 text-center">
          <h1
            id="services-hero"
            className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            Our Services
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            Everything your organization needs to win online — designed, built, and
            supported by one accountable team.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section aria-labelledby="services-list" className="bg-white py-20">
        <div className="container-site flex flex-col gap-12">
          <h2 id="services-list" className="sr-only">
            Complete list of services
          </h2>
          {services.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <EmptyState
              variant="service"
              title="Services coming soon"
              description="Our service catalogue is being updated. Please check back shortly or contact us directly."
            />
          )}
        </div>
      </section>

      {/* Process mini-band */}
      <section aria-labelledby="services-process" className="bg-slate-50 py-16">
        <div className="container-site">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-heading text-2xl font-bold text-navy-800 sm:text-3xl">
              Not sure what you need?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Book a free 30-minute consultation. We will listen to your goals and
              recommend the leanest path to them — even if that path does not involve us.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild className="bg-navy-800 text-white hover:bg-navy-700">
                <Link href="/contact" className="inline-flex items-center gap-2">
                  Book a consultation
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-navy-200 text-navy-800 hover:bg-navy-50">
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {email}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
