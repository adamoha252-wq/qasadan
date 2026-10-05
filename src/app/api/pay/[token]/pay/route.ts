import { NextRequest, NextResponse } from "next/server";
import { initiatePaymentSchema } from "@/lib/payments/schemas";
import { initiatePayment } from "@/lib/payments/checkout";

/**
 * PUBLIC payment-initiation endpoint (Phase 3, spec §4/§5).
 *
 *   POST /api/pay/[token]/pay   { providerCode, paymentMethod, payerPhone? }
 *
 * The 192-bit token in the URL IS the authorization (same model as the
 * /pay page — unknown tokens get a generic 404, no existence leak).
 * Everything the client sent is re-validated server-side; on success the
 * response contains only the provider's hosted-checkout URL to redirect to.
 * Secrets never appear in request or response bodies.
 */

type Params = { params: Promise<{ token: string }> };

/**
 * Absolute origin for the provider callback URLs. Behind the preview/edge
 * gateway the external host lives in x-forwarded-host — prefer it when
 * present (WAAFI requires absolute HTTPS callback URLs).
 */
function externalOrigin(request: NextRequest): string {
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto");
  if (fwdHost && (fwdProto === "https" || fwdHost.includes("localhost"))) {
    return `${fwdProto ?? "https"}://${fwdHost}`;
  }
  if (fwdHost && fwdProto) return `${fwdProto}://${fwdHost}`;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = initiatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const outcome = await initiatePayment({
    token,
    providerCode: parsed.data.providerCode,
    paymentMethod: parsed.data.paymentMethod,
    payerPhone: parsed.data.payerPhone,
    origin: externalOrigin(request),
  });

  if (outcome.kind === "REDIRECT") {
    return NextResponse.json({ redirectUrl: outcome.redirectUrl, resumed: outcome.resumed });
  }

  const response = NextResponse.json({ error: outcome.error }, { status: outcome.status });
  if (outcome.retryAfterSec) response.headers.set("Retry-After", String(outcome.retryAfterSec));
  return response;
}
