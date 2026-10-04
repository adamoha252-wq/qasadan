import { z } from "zod";

/** Shared validation schemas for admin CMS operations. */

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120)
  .regex(slugRegex, "Use lowercase letters, numbers and hyphens only");

export const serviceSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  slug: slugField,
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000),
  icon: z.string().trim().max(40).default("Code2"),
  features: z.array(z.string().trim().max(150)).max(12).default([]),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  order: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const projectSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(150),
  slug: slugField,
  client: z.string().trim().max(150).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  summary: z.string().trim().min(10, "Summary must be at least 10 characters").max(500),
  content: z.string().trim().max(50000).default(""),
  technologies: z.array(z.string().trim().max(40)).max(20).default([]),
  externalUrl: z
    .string()
    .trim()
    .url("Enter a valid URL (https://…)")
    .max(500)
    .optional()
    .or(z.literal("")),
  coverImage: z.string().trim().max(500).optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  completedAt: z.string().trim().optional().or(z.literal("")),
  order: z.number().int().min(0).max(999).default(0),
});

export const projectImageSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required").max(500),
  caption: z.string().trim().max(200).optional().or(z.literal("")),
  order: z.number().int().min(0).max(99).default(0),
});

export const articleSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  slug: slugField,
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().max(100000).default(""),
  categoryId: z.string().trim().optional().or(z.literal("")),
  coverImage: z.string().trim().max(500).optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
  isArchived: z.boolean().default(false),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(60),
  slug: slugField,
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  role: z.string().trim().min(2, "Role is required").max(100),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  linkedinUrl: z.string().trim().url("Enter a valid URL").max(300).optional().or(z.literal("")),
  twitterUrl: z.string().trim().url("Enter a valid URL").max(300).optional().or(z.literal("")),
  order: z.number().int().min(0).max(99).default(0),
  isActive: z.boolean().default(true),
});

export const testimonialSchema = z.object({
  clientName: z.string().trim().min(2, "Client name is required").max(100),
  clientRole: z.string().trim().max(100).optional().or(z.literal("")),
  company: z.string().trim().max(100).optional().or(z.literal("")),
  quote: z.string().trim().min(10, "Quote must be at least 10 characters").max(1000),
  rating: z.number().int().min(1).max(5).default(5),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  isPublished: z.boolean().default(true),
});

export const inquiryStatusSchema = z.object({
  status: z.enum(["NEW", "READ", "RESPONDED", "ARCHIVED"]),
});

export const settingsSchema = z.object({
  values: z.record(z.string(), z.string().trim().max(2000)),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ArticleInput = z.infer<typeof articleSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type TestimonialInput = z.infer<typeof testimonialSchema>;

export const siteStatSchema = z.object({
  value: z.string().trim().min(1, "Value is required").max(20),
  label: z.string().trim().min(2, "Label is required").max(60),
  order: z.number().int().min(0).max(99).default(0),
  isActive: z.boolean().default(true),
});

export const pricingPlanSchema = z.object({
  name: z.string().trim().min(2, "Plan name is required").max(60),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  price: z.string().trim().min(1, "Price is required").max(30),
  period: z.string().trim().min(1).max(30).default("per project"),
  features: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  isFeatured: z.boolean().default(false),
  ctaLabel: z.string().trim().min(2).max(40).default("Choose Plan"),
  order: z.number().int().min(0).max(99).default(0),
  isActive: z.boolean().default(true),
});

export const partnerSchema = z.object({
  name: z.string().trim().min(2, "Partner name is required").max(120),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  logoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  websiteUrl: z.string().trim().url("Enter a valid URL").max(300).optional().or(z.literal("")),
  order: z.number().int().min(0).max(99).default(0),
  isActive: z.boolean().default(true),
});

export type SiteStatInput = z.infer<typeof siteStatSchema>;
export type PricingPlanInput = z.infer<typeof pricingPlanSchema>;
export type PartnerInput = z.infer<typeof partnerSchema>;

