import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, Globe, MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { ContactForm } from "@/components/site/contact-form";
import { getPublicSettings } from "@/lib/data/public";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with QASADAN — tell us about your project and we will respond within 1-2 business days. Based in Mogadishu, serving East Africa and beyond.",
  alternates: { canonical: "/contact" },
};

// ISR: cached for speed; auto-refreshes (max 60s) or instantly via the admin CMS.
export const revalidate = 60;

export default async function ContactPage() {
  const settings = await getPublicSettings();
  const email = settings["contact.email"] || siteConfig.email;
  const phone = settings["contact.phone"] || siteConfig.phone;
  const phoneHref = phone.replace(/[^+\d]/g, "");
  const phoneAlt = settings["contact.phoneAlt"] || siteConfig.phoneAlt;
  const phoneAltHref = phoneAlt.replace(/[^+\d]/g, "");
  const whatsapp = settings["contact.whatsapp"] || siteConfig.whatsapp;
  const address = settings["contact.address"] || siteConfig.address;

  return (
    <>
      {/* Hero */}
      <section className="bg-pixel-grid relative overflow-hidden bg-navy-800 py-16 lg:py-20" aria-labelledby="contact-hero">
        <div className="container-site relative flex flex-col items-center gap-6 text-center">
          <h1
            id="contact-hero"
            className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            Contact Us
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
            Have a project in mind, a question about our work, or just want to say
            salaam? We would love to hear from you.
          </p>
        </div>
      </section>

      {/* Form + info */}
      <section aria-labelledby="contact-form-heading" className="bg-white py-16 lg:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          {/* Form */}
          <div className="flex flex-col gap-8">
            <SectionHeading
              align="left"
              eyebrow="Send a Message"
              title="Tell us about your project"
              description="Fill in the form below and we will get back to you within 1–2 business days."
              as="h2"
            />
            <ContactForm />
          </div>

          {/* Info cards */}
          <aside className="flex flex-col gap-6" aria-label="Contact information">
            <div className="ab-card group rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="font-heading text-base font-semibold text-navy-800">
                Contact details
              </h2>
              <ul className="mt-5 flex flex-col gap-5">
                <li className="flex items-start gap-3">
                  <Mail className="ab-icon-hover mt-0.5 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
                    <a
                      href={`mailto:${email}`}
                      className="text-sm font-medium text-navy-800 transition-colors hover:text-cyan-700"
                    >
                      {email}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="ab-icon-hover mt-0.5 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                    <a
                      href={`tel:${phoneHref}`}
                      className="text-sm font-medium text-navy-800 transition-colors hover:text-cyan-700"
                    >
                      {phone}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="ab-icon-hover mt-0.5 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone (alt)</p>
                    <a
                      href={`tel:${phoneAltHref}`}
                      className="text-sm font-medium text-navy-800 transition-colors hover:text-cyan-700"
                    >
                      {phoneAlt}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MessageCircle className="ab-icon-hover mt-0.5 h-5 w-5 shrink-0 text-[#25D366]" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">WhatsApp</p>
                    <a
                      href={`https://wa.me/${whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-navy-800 transition-colors hover:text-[#1DA851]"
                    >
                      Chat with us — quick response
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="ab-icon-hover mt-0.5 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Office</p>
                    <p className="text-sm font-medium text-navy-800">{address}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Globe className="ab-icon-hover mt-0.5 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service area</p>
                    <p className="text-sm font-medium text-navy-800">
                      East Africa &amp; worldwide (remote)
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="ab-anim bg-pixel-grid rounded-2xl bg-navy-800 p-6">
              <div className="flex items-center gap-2 text-cyan-300">
                <Clock className="ab-icon-hover h-4 w-4" aria-hidden="true" />
                <h2 className="text-xs font-semibold uppercase tracking-widest">
                  Response time
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-navy-200">
                We reply to every genuine inquiry within 1–2 business days. For urgent
                matters, mention it in the subject line and we will prioritize.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
