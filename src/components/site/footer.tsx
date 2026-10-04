import Link from "next/link";
import { Facebook, Twitter, Linkedin, Instagram, Github, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { Logo } from "@/components/site/logo";

const socialLinks = [
  { name: "Facebook", href: siteConfig.socials.facebook, icon: Facebook },
  { name: "X (Twitter)", href: siteConfig.socials.twitter, icon: Twitter },
  { name: "LinkedIn", href: siteConfig.socials.linkedin, icon: Linkedin },
  { name: "Instagram", href: siteConfig.socials.instagram, icon: Instagram },
  { name: "GitHub", href: siteConfig.socials.github, icon: Github },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-navy-800 text-navy-100" role="contentinfo">
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="flex flex-col gap-5">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-navy-200">
            {siteConfig.description}
          </p>
          <div className="flex items-center gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`QASADAN on ${social.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-navy-200 transition-colors hover:bg-cyan-500 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                <social.icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <nav aria-label="Footer navigation">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Company
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {siteConfig.mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-navy-200 transition-colors hover:text-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Services */}
        <nav aria-label="Footer services">
          <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Services
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {siteConfig.footerServices.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="text-sm text-navy-200 transition-colors hover:text-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Get in Touch
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-sm text-navy-200 transition-colors hover:text-cyan-400"
              >
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <a
                href={`tel:${siteConfig.phoneHref}`}
                className="text-sm text-navy-200 transition-colors hover:text-cyan-400"
              >
                {siteConfig.phone}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <a
                href={`tel:${siteConfig.phoneAltHref}`}
                className="text-sm text-navy-200 transition-colors hover:text-cyan-400"
              >
                {siteConfig.phoneAlt}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <a
                href={siteConfig.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-navy-200 transition-colors hover:text-cyan-400"
              >
                WhatsApp — quick response
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
              <span className="text-sm text-navy-200">{siteConfig.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-navy-700">
        <span aria-hidden="true" className="ab-line block h-[2px] w-full" />
        <div className="container-site flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          <p className="text-xs text-navy-300">
            © {year} {siteConfig.legalName}. All rights reserved.
          </p>
          <p className="text-xs text-navy-300">
            Crafted with precision by <span className="font-semibold text-cyan-400">QASADAN</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
