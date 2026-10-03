import type { MetadataRoute } from "next";
import { getPublishedProjects, getPublishedArticles } from "@/lib/data/public";
import { siteConfig } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/who-we-are",
    "/services",
    "/portfolio",
    "/news",
    "/contact",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/contact" ? 0.8 : 0.7,
  }));

  const [projects, articles] = await Promise.all([
    getPublishedProjects(),
    getPublishedArticles(),
  ]);

  const projectPages: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${base}/portfolio/${p.slug}`,
    lastModified: p.completedAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/news/${a.slug}`,
    lastModified: a.publishedAt ?? new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...projectPages, ...articlePages];
}
