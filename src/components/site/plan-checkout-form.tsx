"use client";

/**
 * Public plan-order form (pricing "Choose Plan" → /checkout/<planId>).
 *
 * Collects the buyer's identity only (name + optional email); the payment
 * provider / method selection (incl. mobile wallets) and the wallet number
 * happen on the NEXT page — the existing QASADAN Secure Checkout (/pay/<token>)
 * — so the whole verified payment pipeline is reused unchanged.
 *
 * On success the server returns only the invoice token; this component
 * redirects to /pay/<token>.
 */

import { useState } from "react";
import { ArrowRight, Loader2, Lock, TriangleAlert } from "lucide-react";
import { formatMoney } from "@/lib/payments/invoice-types";

type Props = {
  planId: string;
  planName: string;
  /** Pre-formatted amount string, e.g. "150.00". */
  amount: string;
  currency: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PlanCheckoutForm({ planId, planName, amount, currency }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameInvalid = name.trim().length > 0 && name.trim().length < 2;
  const emailInvalid = email.trim() !== "" && !EMAIL_RE.test(email.trim());
  const canSubmit = name.trim().length >= 2 && !emailInvalid && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, name: name.trim(), email: email.trim() }),
      });
      const data = (await response.json()) as { token?: string; error?: string };
      if (response.ok && data.token) {
        window.location.href = `/pay/${encodeURIComponent(data.token)}`;
        return; // keep the loading state while the browser navigates away
      }
      setError(data.error ?? "Could not place your order. Please try again.");
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="order-details-heading"
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2
        id="order-details-heading"
        className="text-base font-semibold text-navy-900"
      >
        Your details
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Who is the {planName} plan for? We attach this to your order so QASADAN
        knows who paid.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="order-name"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Full name <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="order-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amina Hassan"
            aria-required="true"
            aria-invalid={nameInvalid || undefined}
            className={`mt-2 w-full rounded-xl border px-4 py-3 text-base text-navy-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 ${
              nameInvalid
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
            }`}
          />
          {nameInvalid && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Please enter your full name (at least 2 characters).
            </p>
          )}
        </div>

        {/* Email (optional — receipt follow-up, kept private) */}
        <div>
          <label
            htmlFor="order-email"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Email <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <input
            id="order-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={emailInvalid || undefined}
            className={`mt-2 w-full rounded-xl border px-4 py-3 text-base text-navy-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 ${
              emailInvalid
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
            }`}
          />
          {emailInvalid ? (
            <p className="mt-1 text-xs font-medium text-red-600">
              Enter a valid email address, or leave it empty.
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Only used to follow up on your order — never shown on the public
              payment page.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {/* Continue */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Preparing your secure payment…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" aria-hidden="true" />
              Continue to payment — {formatMoney(amount, currency)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">
        On the next page you choose how to pay — mobile wallet (EVC Plus, ZAAD,
        SAHAL), card or bank — on the payment provider&apos;s own secure page.
      </p>
    </section>
  );
}
