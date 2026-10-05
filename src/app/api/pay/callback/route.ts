import { NextRequest, NextResponse } from "next/server";
import { recordProviderCallback } from "@/lib/payments/checkout";

/**
 * Provider payment callback (Phase 3, spec §5/§6).
 *
 * WAAFI Pay's HPP flow (official docs: /hpp-api) calls the merchant's
 * hppSuccessCallbackUrl / hppFailureCallbackUrl after the customer
 * completes (or aborts) the payment on the hosted page. We registered:
 *
 *   {origin}/api/pay/callback?ref=<referenceId>&result=success
 *   {origin}/api/pay/callback?ref=<referenceId>&result=failure
 *
 * (`ref`/`result` are OUR params; anything else the provider appends is
 * recorded verbatim in the payment attempt's callbackData.)
 *
 * Contract per the docs: the URL must return HTTP 200 — so this route
 * ALWAYS returns 200, even for unknown references (no existence leak).
 * GET (hppRespDataFormat=2, browser-style) returns a tiny HTML page that
 * instantly forwards the customer back to their invoice; POST
 * (server-to-server) returns 200 JSON.
 *
 * UNTRUSTED BY DESIGN (zero frontend trust): a callback never marks an
 * invoice PAID — it only records the event. On failure it releases the
 * invoice back to PENDING so the customer can retry. The PAID transition
 * happens exclusively in the server-side verification flow (Phase 4).
 */

const GENERIC_TOKEN = "no-token";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function landingPageHtml(token: string | null, result: "success" | "failure"): string {
  // token only ever comes from OUR database lookup — escape anyway (defense
  // in depth against ever storing a malformed value).
  const target = token
    ? `/pay/${encodeURIComponent(token)}?returned=${result}`
    : "/";
  const title = result === "success" ? "Payment received" : "Payment not completed";
  const body =
    result === "success"
      ? "Thank you! Your payment is being verified — forwarding you to your invoice…"
      : "The payment was not completed. You can try again from your invoice page — forwarding you…";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="robots" content="noindex,nofollow" />
<title>${title} — QASADAN</title>
<meta http-equiv="refresh" content="0;url=${target}" />
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}main{text-align:center;max-width:24rem;padding:2rem}p{line-height:1.6}a{color:#0e7490;font-weight:600}</style>
</head>
<body><main>
<p><strong>QASADAN</strong></p>
<p>${body}</p>
<p><a href="${target}">Continue to your invoice</a></p>
</main></body>
</html>`;
}

async function collectRawParams(
  request: NextRequest
): Promise<Record<string, unknown>> {
  const raw: Record<string, unknown> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "ref" && key !== "result") raw[key] = value.slice(0, 500);
  });
  // POST body: tolerate JSON, form-encoded and anything else by size-capping.
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const json = await request.json();
        if (json && typeof json === "object") {
          for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
            raw[`body.${k}`] = typeof v === "string" ? v.slice(0, 500) : v;
          }
        }
      } else {
        const form = await request.formData();
        for (const [k, v] of form.entries()) {
          raw[`form.${k}`] = typeof v === "string" ? v.slice(0, 500) : "[file]";
        }
      }
    } catch {
      // unreadable/empty body — fine, query params (if any) were captured
    }
  }
  return raw;
}

function resultFromQuery(request: NextRequest): "success" | "failure" {
  return request.nextUrl.searchParams.get("result") === "success" ? "success" : "failure";
}

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const result = resultFromQuery(request);
  const raw = await collectRawParams(request);
  const outcome = await recordProviderCallback({ referenceId: ref, result, raw });
  return new NextResponse(landingPageHtml(outcome.token, result), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const result = resultFromQuery(request);
  const raw = await collectRawParams(request);
  await recordProviderCallback({ referenceId: ref, result, raw });
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
