"use client";

/**
 * QASADAN Secure Checkout — payment status checker (Phase 4, spec §5/§7).
 *
 * Shown on /pay/<token> while an invoice is PROCESSING. The customer (or
 * the automatic return from the provider's hosted page) can ask the server
 * to VERIFY the payment: the request body is empty — the server re-checks
 * everything against the provider's API (zero frontend trust). When the
 * outcome is conclusive the page reloads and shows the success panel
 * (PAID) or the checkout again (DECLINED → invoice back to Pending).
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert } from "lucide-react";

type VerifyResponse = {
  state?: "PAID" | "CONFIRMING" | "DECLINED" | "RATE_LIMITED";
  message?: string;
  error?: string;
};

type Props = {
  /** true right after returning from the provider's success callback — verify once automatically. */
  autoVerify: boolean;
};

/** Reads the payment token from the URL at call time (never serialized into props). */
function tokenFromLocation(): string {
  const part = window.location.pathname.split("/pay/")[1] ?? "";
  return part.replace(/\/+$/, "");
}

export function PaymentStatusPanel({ autoVerify }: Props) {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"ok" | "wait" | "bad" | null>(null);
  const autoRan = useRef(false);

  async function verify() {
    setChecking(true);
    setMessage(null);
    try {
      const token = tokenFromLocation();
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json()) as VerifyResponse;

      if (response.ok && data.state === "PAID") {
        setOutcome("ok");
        setMessage("Payment confirmed — loading your receipt…");
        setTimeout(() => window.location.reload(), 900);
        return;
      }
      if (response.ok && data.state === "DECLINED") {
        setOutcome("bad");
        setMessage(
          data.message ?? "The payment did not complete. You can try again in a moment."
        );
        setTimeout(() => window.location.reload(), 1600);
        return;
      }
      if (response.status === 429 || data.state === "RATE_LIMITED") {
        setOutcome("wait");
        setMessage("Checked recently — please wait a moment before checking again.");
        return;
      }
      if (response.status === 404) {
        setOutcome("bad");
        setMessage("This payment link is no longer available.");
        return;
      }
      setOutcome("wait");
      setMessage(
        data.message ??
          data.error ??
          "Your payment has not been confirmed yet — check again in a minute or two."
      );
    } catch {
      setOutcome("wait");
      setMessage("Network problem — check your connection and try again.");
    } finally {
      setChecking(false);
    }
  }

  // Automatic one-shot verification when returning from the provider.
  useEffect(() => {
    if (!autoVerify || autoRan.current) return;
    autoRan.current = true;
    verify();
  }, [autoVerify]);

  return (
    <section
      aria-labelledby="status-check-heading"
      className="mt-4 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2
        id="status-check-heading"
        className="flex items-center gap-2 text-base font-semibold text-navy-900"
      >
        <RefreshCw className="h-4 w-4 text-sky-600" aria-hidden="true" />
        Confirm your payment
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Already finished paying on the provider&apos;s page? Check the status here — we
        verify it directly with the payment provider.
      </p>

      {message && (
        <div
          role="status"
          className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
            outcome === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : outcome === "bad"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {outcome === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : outcome === "bad" ? (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          ) : (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
          )}
          <p>{message}</p>
        </div>
      )}

      <button
        type="button"
        onClick={verify}
        disabled={checking}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-5 py-3 text-sm font-bold text-sky-800 transition-colors hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {checking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Verifying with the provider…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Check payment status
          </>
        )}
      </button>
    </section>
  );
}
