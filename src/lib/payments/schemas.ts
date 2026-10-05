import { z } from "zod";

/**
 * Validation schemas for the payment provider admin API.
 * Registry-driven rules (allowed credential keys, method/currency codes)
 * are enforced in the route handlers using the provider definition.
 */

export const addProviderSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Provider code is required")
    .max(40, "Unknown provider"),
});

export const updateProviderSchema = z.object({
  isSandbox: z.boolean().optional(),
  isActive: z.boolean().optional(),
  methods: z.array(z.string().trim().min(2).max(40)).max(12).optional(),
  // WAAFI Pay uses non-ISO codes like "SLSH" (4 chars) — allow 3–5.
  currencies: z
    .array(z.string().trim().min(3, "Currency codes have 3–5 letters").max(5))
    .max(10)
    .optional(),
  /**
   * Partial credentials patch. Keys are validated against the provider
   * definition in the handler. A non-empty string sets/replaces the value,
   * an empty string removes it. Secrets are only ever sent TO the server.
   */
  credentials: z.record(z.string(), z.string().trim().max(200)).optional(),
});

export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;

/* ============ Invoices (Phase 2) ============ */

const clientEmailField = z
  .string()
  .trim()
  .max(160, "Email is too long")
  .email("Enter a valid email address")
  .optional()
  .or(z.literal(""));

export const createInvoiceSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(120, "Client name is too long"),
  clientEmail: clientEmailField,
  projectService: z
    .string()
    .trim()
    .min(1, "Project / service is required")
    .max(160, "Project / service is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional(),
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .positive("Amount must be greater than zero")
    .max(99999999.99, "Amount is too large")
    .refine(
      (v) => Math.round((v + Number.EPSILON) * 100) / 100 === v,
      "Amount supports at most 2 decimal places"
    )
    .transform((v) => Math.round((v + Number.EPSILON) * 100) / 100),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3,5}$/, "Currency code must be 3–5 letters (e.g. USD, SLSH)"),
  dueDate: z
    .string()
    .trim()
    .min(1)
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid due date")
    .optional()
    .or(z.literal("")),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/* ============ Public plan checkout (pricing → order → /pay) ============ */

/**
 * Body of the public POST /api/checkout/plan endpoint (pricing section
 * "Choose Plan" flow). The plan, its price and its currency are re-fetched
 * and re-parsed SERVER-SIDE — the browser never supplies money values
 * (zero frontend trust).
 */
export const planOrderSchema = z.object({
  planId: z.string().trim().min(1, "Plan is required").max(64, "Unknown plan"),
  name: z
    .string()
    .trim()
    .min(1, "Your name is required")
    .max(120, "Name is too long"),
  email: clientEmailField,
});

export type PlanOrderInput = z.infer<typeof planOrderSchema>;

/* ============ Client checkout (Phase 3) ============ */

/**
 * Body of the public POST /api/pay/[token]/pay endpoint. The token in the
 * URL is the authorization; everything else is re-validated server-side
 * against the live provider + invoice state (zero frontend trust).
 */
export const initiatePaymentSchema = z.object({
  providerCode: z
    .string()
    .trim()
    .min(2, "Select a payment provider")
    .max(40, "Unknown payment provider"),
  paymentMethod: z
    .string()
    .trim()
    .min(3, "Select a payment method")
    .max(40, "Unknown payment method"),
  /**
   * Customer's mobile/account number (WAAFI payerInfo.subscriptionId).
   * Required server-side when the chosen method needs it; normalized there
   * (spaces/dashes/+ stripped).
   */
  payerPhone: z.string().trim().max(24, "Mobile number is too long").optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
