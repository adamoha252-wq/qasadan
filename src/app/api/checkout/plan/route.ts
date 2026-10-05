import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { planOrderSchema } from "@/lib/payments/schemas";
import { parsePlanPrice } from "@/lib/payments/plan-checkout";
import {
  findInvoiceByToken,
  generateInvoiceToken,
  isSupportedInvoiceCurrency,
  nextInvoiceNumber,
} from "@/lib/payments/invoices";

/**
 * Public plan-order endpoint (pricing section "Choose Plan" flow).
 *
 * Creates a PENDING invoice for the selected plan and returns ONLY its
 * secure payment token — the browser then redirects to /pay/<token>, the
 * existing QASADAN Secure Checkout page, where the customer selects the
 * payment provider and method (e.g. WAAFI Pay → Mobile Wallet) and pays.
 *
 * Security model (mirrors the pay-initiation endpoint, Phase 3):
 *  - ZERO frontend trust: plan, price and currency are re-fetched and
 *    re-parsed server-side. The request body never carries money values.
 *  - Only ACTIVE plans are orderable; unknown/inactive ids are a clean 404.
 *  - Per-IP rate limiting (in-memory, like the other public endpoints) so
 *    the invoice table cannot be spammed from one address.
 *  - The response contains the token only — no internal ids, no email echo.
 */

/* ------------------------- rate limiting (per IP) ------------------------- */

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5; // real order submissions per IP per window
const rateBuckets = new Map<string, { count: number; firstAt: number }>();

function checkOrderRate(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateBuckets.get(ip);
  if (!entry || now - entry.firstAt > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, firstAt: now });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.firstAt + RATE_WINDOW_MS - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/* ------------------------------- handler ------------------------------- */

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = planOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Please check your details and try again." },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Rate limit AFTER validation — typos never lock a customer out.
  const rate = checkOrderRate(clientIp(request));
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Too many orders from this connection — please wait ${Math.ceil(
          rate.retryAfterSec / 60
        )} minutes or contact us directly.`,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  // Server-side plan lookup + price parse (zero trust in the browser).
  const plan = await db.pricingPlan.findFirst({
    where: { id: input.planId, isActive: true },
  });
  if (!plan) {
    return NextResponse.json(
      { error: "This plan is not available. Please pick a plan from the pricing page." },
      { status: 404 }
    );
  }

  const price = parsePlanPrice(plan.price);
  if (!price) {
    return NextResponse.json(
      {
        error:
          "This plan has custom pricing and cannot be ordered online — please contact us for a quote.",
      },
      { status: 400 }
    );
  }

  if (!isSupportedInvoiceCurrency(price.currency)) {
    return NextResponse.json(
      {
        error:
          "Online payment for this plan's currency is not available yet — please contact us.",
      },
      { status: 400 }
    );
  }

  // Unique-constraint safe creation (token / invoice number races):
  // retry with fresh values up to 3 times — same pattern as the admin API.
  for (let attempt = 0; attempt < 3; attempt++) {
    const [invoiceNumber, token] = await Promise.all([
      nextInvoiceNumber(),
      generateInvoiceToken(),
    ]);
    if (await findInvoiceByToken(token)) continue;

    try {
      await db.invoice.create({
        data: {
          invoiceNumber,
          token,
          clientName: input.name,
          clientEmail: input.email?.trim() ? input.email.trim() : null,
          projectService: `${plan.name} Plan`,
          description: `Online plan order from the QASADAN website pricing page (${plan.price} ${plan.period}).`,
          amount: price.amount,
          currency: price.currency,
          status: "PENDING",
        },
      });
      // Token only — the /pay page re-reads everything from the database.
      return NextResponse.json({ token }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Unique constraint") && attempt < 2) continue;
      throw error;
    }
  }

  return NextResponse.json(
    { error: "Could not place your order — please try again." },
    { status: 500 }
  );
}
