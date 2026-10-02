import type { Metadata } from "next";

/**
 * Admin root layout — applies noindex to ALL admin routes (including login,
 * which lives outside the (protected) group).
 */
export const metadata: Metadata = {
  title: { default: "Admin — QASADAN CMS", template: "%s | QASADAN CMS" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
