import "server-only";
import { db } from "@/lib/db";
import { cache } from "react";

/**
 * PUBLIC data-access layer (RLS-equivalent of "public read" policies).
 *
 * Rules enforced by this layer — DO NOT bypass it in public pages:
 *  1. Only PUBLISHED / ACTIVE rows are ever returned.
 *  2. Sensitive columns (AdminUser.passwordHash, Session tokens) are never selected here.
 *  3. Inquiries (private user data) are NOT exposed — admin-only (see lib/data/admin.ts).
 *
 * All writes go exclusively through admin-authenticated API routes (Phase 3/5),
 * which is the equivalent of "authenticated role with write policy".
 */

export type PublicService = {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  features: string[];
  imageUrl: string | null;
  order: number;
};

export type PublicProject = {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  category: string | null;
  summary: string;
  content: string;
  technologies: string[];
  externalUrl: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  completedAt: Date | null;
  order: number;
  images: { id: string; url: string; caption: string | null; order: number }[];
};

export type PublicArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  publishedAt: Date | null;
  category: { id: string; name: string; slug: string } | null;
};

export type PublicTeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  imageUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
};

export type PublicTestimonial = {
  id: string;
  clientName: string;
  clientRole: string | null;
  company: string | null;
  quote: string;
  rating: number;
  imageUrl: string | null;
};

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// ---------- Services ----------

export const getPublishedServices = cache(async (): Promise<PublicService[]> => {
  const rows = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true, title: true, slug: true, description: true, icon: true,
      features: true, imageUrl: true, order: true,
    },
  });
  return rows.map((r) => ({ ...r, features: parseJsonArray(r.features) }));
});

// ---------- Projects ----------

export const getPublishedProjects = cache(async (): Promise<PublicProject[]> => {
  const rows = await db.project.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { completedAt: "desc" }],
    select: {
      id: true, title: true, slug: true, client: true, category: true, summary: true,
      content: true, technologies: true, externalUrl: true, coverImage: true,
      isFeatured: true, completedAt: true, order: true,
      images: { select: { id: true, url: true, caption: true, order: true }, orderBy: { order: "asc" } },
    },
  });
  return rows.map((r) => ({ ...r, technologies: parseJsonArray(r.technologies) }));
});

export const getFeaturedProjects = cache(async (limit = 2): Promise<PublicProject[]> => {
  const all = await getPublishedProjects();
  return all.filter((p) => p.isFeatured).slice(0, limit);
});

export const getPublishedProjectBySlug = cache(
  async (slug: string): Promise<PublicProject | null> => {
    const all = await getPublishedProjects();
    return all.find((p) => p.slug === slug) ?? null;
  }
);

// ---------- News ----------

export const getPublishedArticles = cache(async (limit?: number): Promise<PublicArticle[]> => {
  const rows = await db.newsArticle.findMany({
    where: { isPublished: true, isArchived: false },
    orderBy: { publishedAt: "desc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });
  return rows;
});

export const getPublishedArticleBySlug = cache(
  async (slug: string): Promise<PublicArticle | null> => {
    const row = await db.newsArticle.findFirst({
      where: { slug, isPublished: true, isArchived: false },
      select: {
        id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true,
        publishedAt: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    return row ?? null;
  }
);

export const getNewsCategories = cache(async () => {
  return db.newsCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
});

// ---------- Team ----------

export const getActiveTeamMembers = cache(async (): Promise<PublicTeamMember[]> => {
  return db.teamMember.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, role: true, bio: true, imageUrl: true,
      linkedinUrl: true, twitterUrl: true,
    },
  });
});

// ---------- Testimonials ----------

export const getPublishedTestimonials = cache(async (): Promise<PublicTestimonial[]> => {
  return db.testimonial.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, clientName: true, clientRole: true, company: true, quote: true,
      rating: true, imageUrl: true,
    },
  });
});

// ---------- Site settings (public-safe keys only) ----------

const PUBLIC_SETTING_KEYS = [
  "contact.email", "contact.phone", "contact.address",
  "social.facebook", "social.twitter", "social.linkedin", "social.instagram",
  "site.tagline",
] as const;

export const getPublicSettings = cache(async (): Promise<Record<string, string>> => {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: [...PUBLIC_SETTING_KEYS] } },
    select: { key: true, value: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
});
