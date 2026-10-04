export const siteConfig = {
  name: "QASADAN",
  legalName: "QASADAN Web Development Agency",
  tagline: "Web Development Agency",
  description:
    "QASADAN is a full-service web development agency crafting high-performance websites, web applications, and digital products for organizations across East Africa and beyond.",
  // Canonical URL — update when the custom domain is connected (see DEPLOYMENT.md §7)
  url: "https://qasadan.vercel.app",
  email: "info@qasadan.com",
  phone: "+252 612 307 888",
  phoneHref: "+252612307888",
  phoneAlt: "+212 617 734 376",
  phoneAltHref: "+212617734376",
  whatsapp: "252612307888",
  whatsappHref: "https://wa.me/252612307888",
  address: "Mogadishu, Somalia",
  mainNav: [
    { title: "Home", href: "/" },
    { title: "About Us", href: "/about" },
    { title: "Who We Are", href: "/who-we-are" },
    { title: "Services", href: "/services" },
    { title: "Portfolio", href: "/portfolio" },
    { title: "News", href: "/news" },
    { title: "Contact", href: "/contact" },
  ] as { title: string; href: string }[],
  footerServices: [
    { title: "Web Development", href: "/services" },
    { title: "Web Applications", href: "/services" },
    { title: "UI/UX Design", href: "/services" },
    { title: "Branding & Identity", href: "/services" },
    { title: "SEO & Growth", href: "/services" },
    { title: "Maintenance & Support", href: "/services" },
  ] as { title: string; href: string }[],
  socials: {
    facebook: "https://facebook.com/qasadan",
    twitter: "https://x.com/qasadan",
    linkedin: "https://linkedin.com/company/qasadan",
    instagram: "https://instagram.com/qasadan",
    github: "https://github.com/qasadan",
  },
} as const;

export type SiteConfig = typeof siteConfig;
