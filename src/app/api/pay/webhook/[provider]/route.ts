import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadCredentials } from "@/lib/payments/credentials";
import { getProviderDefinition } from "@/lib/payments/registry";
import { verifyWaafiWebhookSignature } from "@/lib/payments/waafipay";
import { verifyAttemptByReferenceId } from "@/lib/payments/verification";

/**
 * Incoming payment-provider webhook (Phase 4, spec §5).
 *
 *   POST /api/pay/webhook/[provider]        e.g. /api/pay/webhook/waafipay
 *
 * WAAFI Pay webhooks (official docs: /webhooks):
 *  - Headers: X-Webhook-Timestamp (unix seconds), X-Webhook-Event-Id,
 *    X-Webhook-Signature — lowercase-hex HMAC-SHA256 over
 *    "{timestamp}.{event_id}.{raw body bytes}" with the secret shown once
 *    at WEBHOOK_REGISTER time (stored encrypted on the provider record).
 *  - Replays older than 5 minutes must be rejected; deliveries are not
 *    retried, so the endpoint answers 200 quickly.
 *  - A registration test ping {"event":"webhook.test"} arrives unsigned
 *    with User-Agent "WPNotifyService-Test" — answer 200 without acting.
 *
 * ZERO-TRUST: the payload is never trusted for the PAID decision. After the
 * signature check, the ONLY value used is payment.reference_id — our own
 * reference for the attempt — and the actual decision is re-made against
 * the provider's API (HPP_GETTRANINFO) in the verification flow. The
 * endpoint ALWAYS returns 200 (no existence or state leak to callers).
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ provider: string }> };

/** Small in-memory event-id dedupe (docs: "dedupe on event ID"). */
const SEEN_TTL_MS = 15 * 60 * 1000;
const SEEN_CAP = 2000;
const seenEvents = new Map<string, number>();

function isDuplicateEvent(eventId: string): boolean {
  const now = Date.now();
  if (seenEvents.size > SEEN_CAP) {
    for (const [id, at] of seenEvents) {
      if (now - at > SEEN_TTL_MS) seenEvents.delete(id);
    }
    if (seenEvents.size > SEEN_CAP) seenEvents.clear(); // hard reset, worst case
  }
  if (seenEvents.has(eventId)) return true;
  seenEvents.set(eventId, now);
  return false;
}

const OK = { ok: true } as const;

export async function POST(request: NextRequest, { params }: Params) {
  const { provider: providerCode } = await params;

  // Raw body MUST be captured before any JSON parsing (it is part of the
  // signing string).
  const rawBody = await request.text().catch(() => "");

  // --- Provider lookup + configured webhook secret ---
  const def = getProviderDefinition(providerCode);
  const provider = await db.paymentProvider.findUnique({ where: { code: providerCode } });
  if (!def || !def.implemented || !provider) return NextResponse.json(OK);

  let parsed: { event?: string; payment?: { reference_id?: string } } = {};
  try {
    parsed = JSON.parse(rawBody) as typeof parsed;
  } catch {
    return NextResponse.json(OK); // undecodable — acknowledge, ignore
  }

  // Registration test ping (unsigned by design, per the docs).
  if (parsed.event === "webhook.test") return NextResponse.json(OK);

  const { values: credentials } = loadCredentials(provider);
  const secret = credentials.webhookSecret?.trim();
  if (!secret) return NextResponse.json(OK); // webhook auth not configured — ignore

  const signature = verifyWaafiWebhookSignature({
    secret,
    timestamp: request.headers.get("x-webhook-timestamp"),
    eventId: request.headers.get("x-webhook-event-id"),
    signature: request.headers.get("x-webhook-signature"),
    rawBody,
  });
  if (!signature.ok) return NextResponse.json(OK); // bad signature/stale — ignore silently

  const eventId = request.headers.get("x-webhook-event-id") ?? "";
  if (eventId && isDuplicateEvent(eventId)) return NextResponse.json(OK);

  // ZERO-TRUST trigger: use ONLY our own referenceId from the payload, then
  // re-verify everything against the provider API.
  const referenceId = parsed.payment?.reference_id;
  if (referenceId) {
    try {
      await verifyAttemptByReferenceId(String(referenceId).slice(0, 64));
    } catch (error) {
      console.error("[payments] webhook verification failed", error);
    }
  }
  return NextResponse.json(OK);
}
