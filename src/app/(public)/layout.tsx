import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { TopBar } from "@/components/site/top-bar";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";

/**
 * Public website layout — top utility bar, header, main content, sticky
 * footer, and the floating WhatsApp action button.
 * (Admin routes live outside this group and render their own chrome.)
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only z-[60] m-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
      >
        Skip to main content
      </a>
      <TopBar />
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {/* Sticky footer: pushed down naturally when content overflows */}
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
