import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

/**
 * Public website layout — header, main content, sticky footer.
 * (Admin routes live outside this group and render their own chrome.)
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {/* Sticky footer: pushed down naturally when content overflows */}
      <Footer />
    </div>
  );
}
