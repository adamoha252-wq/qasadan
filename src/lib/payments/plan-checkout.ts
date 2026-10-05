/**
 * Client-safe helpers for the public plan checkout flow
 * (pricing section "Choose Plan" → /checkout/<planId> → secure /pay/<token>).
 *
 * The pricing plan `price` column is a free-form admin-edited string
 * ("$150", "$1,200", "SLSH 50,000", "Custom"). Plans whose price parses to
 * a positive number become payable online through the standard invoice
 * checkout; every other plan ("Custom", "Free", "Ask us") keeps the previous
 * behaviour — the pricing button links to the contact page.
 *
 * SECURITY: the SAME parser runs on the server inside the public order API
 * (POST /api/checkout/plan) — the browser's parse result is never trusted
 * for the invoice amount or currency (zero frontend trust).
 */

export type ParsedPlanPrice = {
  /** Positive number, rounded to 2 decimals. */
  amount: number;
  /** "USD" | "SLSH" | "DJF" — validated server-side against provider currencies. */
  currency: string;
};

/** Currency hints the parser recognizes inside the price string. */
function detectCurrency(raw: string): string {
  if (/slsh|sos/i.test(raw)) return "SLSH";
  if (/djf/i.test(raw)) return "DJF";
  return "USD"; // "$" and plain numbers default to USD (site plans are priced in $)
}

/**
 * Parses an admin-edited plan price into a payable { amount, currency }.
 * Returns null when the plan cannot be ordered online (no valid number).
 */
export function parsePlanPrice(
  raw: string | null | undefined
): ParsedPlanPrice | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  const currency = detectCurrency(s);

  // First monetary number: "150", "299.99", "1,200", "50,000", "$1,200"
  const match = s.match(/(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { amount: Math.round(amount * 100) / 100, currency };
}

/** True when a plan can be ordered and paid for online. */
export function isPlanPayable(raw: string | null | undefined): boolean {
  return parsePlanPrice(raw) !== null;
}

/**
 * Where the pricing card's "Choose Plan" button points:
 * payable plans → the plan checkout page; everything else → /contact
 * (the previous behaviour, unchanged).
 */
export function planCheckoutHref(plan: { id: string; price: string }): string {
  return isPlanPayable(plan.price)
    ? `/checkout/${encodeURIComponent(plan.id)}`
    : "/contact";
}
