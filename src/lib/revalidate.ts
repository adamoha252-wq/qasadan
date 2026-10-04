import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Public pages are statically cached (ISR, revalidate = 60) for fast global
 * delivery. When an admin saves content, we call this to purge the cached
 * pages immediately so changes go live without waiting for the TTL.
 */
const STATIC_PUBLIC_PATHS = [
  "/",
  "/about",
  "/who-we-are",
  "/services",
  "/portfolio",
  "/news",
  "/contact",
] as const;

export function revalidatePublicSite(): void {
  for (const path of STATIC_PUBLIC_PATHS) {
    revalidatePath(path);
  }
  // Dynamic detail pages (case studies + articles)
  revalidatePath("/portfolio/[slug]", "page");
  revalidatePath("/news/[slug]", "page");
  // Sitemap mirrors published content
  revalidatePath("/sitemap.xml");
}
