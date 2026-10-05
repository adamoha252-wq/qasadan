import { NextRequest, NextResponse } from "next/server";
import { checkVerificationRate, verifyInvoicePaymentByToken } from "@/lib/payments/verification";

/**
 * PUBLIC payment-verification endpoint (Phase 4, spec §5).
 *
 *   POST /api/pay/[token]/verify
 *
 * The 192-bit token in the URL IS the authorization (same model as the
 * /pay page). Zero frontend trust: the request body is IGNORED entirely —
 * verification re-reads OUR database and asks the PROVIDER's API whether
 * the transaction we initiated was approved. Idempotent; rate-limited
 * because each call performs a live provider request.
 *
 * Response:
 *   { state: "PAID", payment: {…receipt data…} }
 *   { state: "CONFIRMING" | "DECLINED", message }
 *   429 { state: "RATE_LIMITED" }  ·  404 for unknown tokens (no leak)
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  const rate = checkVerificationRate(token);
  if (!rate.allowed) {
    const response = NextResponse.json(
      { state: "RATE_LIMITED", message: "Checked recently — please wait a moment before checking again." },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(rate.retryAfterSec));
    return response;
  }

  const outcome = await verifyInvoicePaymentByToken(token);

  switch (outcome.state) {
    case "PAID":
      return NextResponse.json(
        { state: "PAID", payment: outcome.payment },
        { headers: { "Cache-Control": "no-store" } }
      );
    case "CONFIRMING":
      return NextResponse.json(
        { state: "CONFIRMING", message: outcome.message },
        { headers: { "Cache-Control": "no-store" } }
      );
    case "DECLINED":
      return NextResponse.json(
        { state: "DECLINED", message: outcome.message },
        { headers: { "Cache-Control": "no-store" } }
      );
    case "RATE_LIMITED":
      return NextResponse.json({ state: "RATE_LIMITED" }, { status: 429 });
    case "NOT_FOUND":
    default:
      return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
  }
}
