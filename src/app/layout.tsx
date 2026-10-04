import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

/** Media CDN origin (Supabase Storage) — preconnected so cover images start loading immediately. */
const mediaOrigin = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : null;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "QASADAN",
    "web development agency",
    "web design",
    "Somalia web development",
    "East Africa digital agency",
    "Mogadishu web agency",
  ],
  authors: [{ name: siteConfig.legalName }],
  creator: siteConfig.legalName,
  icons: {
    icon: [
      { url: "/qasadan-mark.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "QASADAN — Web Development Agency",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1F3A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {/* Warm up the image CDN connection (React hoists these into <head>) */}
        {mediaOrigin && (
          <>
            <link rel="preconnect" href={mediaOrigin} />
            <link rel="dns-prefetch" href={mediaOrigin} />
          </>
        )}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
