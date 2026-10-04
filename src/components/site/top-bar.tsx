"use client";

import { Phone, Mail, MapPin, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { siteConfig } from "@/lib/site";

/**
 * Thin dark utility bar above the main navbar — phone, email, address
 * and social icons (pattern inspired by leading ICT sites).
 */
export function TopBar() {
  const socials = [
    { name: "Facebook", href: siteConfig.socials.facebook, Icon: Facebook },
    { name: "X (Twitter)", href: siteConfig.socials.twitter, Icon: Twitter },
    { name: "LinkedIn", href: siteConfig.socials.linkedin, Icon: Linkedin },
    { name: "Instagram", href: siteConfig.socials.instagram, Icon: Instagram },
  ];

  return (
    <div className="hidden bg-navy-900 text-navy-200 lg:block">
      <div className="container-site flex h-9 items-center justify-between text-xs">
        <div className="flex items-center gap-5">
          <a
            href={`tel:${siteConfig.phoneHref}`}
            className="flex items-center gap-1.5 text-navy-300 transition-colors hover:text-white"
          >
            <Phone className="h-3 w-3 text-cyan-400" aria-hidden="true" />
            {siteConfig.phone}
          </a>
          <a
            href={`tel:${siteConfig.phoneAltHref}`}
            className="flex items-center gap-1.5 text-navy-300 transition-colors hover:text-white"
          >
            <Phone className="h-3 w-3 text-cyan-400" aria-hidden="true" />
            {siteConfig.phoneAlt}
          </a>
          <a
            href={`mailto:${siteConfig.email}`}
            className="flex items-center gap-1.5 text-navy-300 transition-colors hover:text-white"
          >
            <Mail className="h-3 w-3 text-cyan-400" aria-hidden="true" />
            {siteConfig.email}
          </a>
          <span className="flex items-center gap-1.5 text-navy-300">
            <MapPin className="h-3 w-3 text-cyan-400" aria-hidden="true" />
            {siteConfig.address}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {socials.map(({ name, href, Icon }) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`QASADAN on ${name}`}
              className="flex h-6 w-6 items-center justify-center rounded text-navy-300 transition-colors hover:bg-navy-700 hover:text-cyan-300"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
