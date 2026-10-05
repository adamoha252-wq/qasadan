"use client";

/**
 * QASADAN Secure Checkout — public payment selection panel (Phase 3, §4).
 *
 * Two-step flow on the /pay/<token> page:
 *   1. choose a payment PROVIDER (only the ones QASADAN activated),
 *   2. choose a payment METHOD of that provider (+ the mobile number for
 *      wallet payments),
 *   then "Pay" → the server initiates the payment and returns the
 *   provider's hosted-checkout URL, where the customer completes payment
 *   on the provider's own secure page.
 *
 * The customer's account details are never collected here — only the
 * wallet phone number the provider's own flow requires up-front
 * (WAAFI payerInfo.subscriptionId).
 */

import { useMemo, useState } from "react";
import { ArrowRight, Loader2, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { ProviderIcon } from "@/components/admin/payments/provider-icon";
import {
  formatMoney,
  type InvoiceClientView,
} from "@/lib/payments/invoice-types";
import {
  isValidPayerPhone,
  normalizePayerPhone,
  type CheckoutProvider,
} from "@/lib/payments/checkout-types";

type Props = {
  /** Invoice display data for the summary line. */
  invoiceNumber: InvoiceClientView["invoiceNumber"];
  amount: string;
  currency: string;
  providers: CheckoutProvider[];
};

/** Reads the payment token from the URL at call time (never serialized into props). */
function tokenFromLocation(): string {
  const part = window.location.pathname.split("/pay/")[1] ?? "";
  return part.replace(/\/+$/, "");
}

export function CheckoutPanel({ invoiceNumber, amount, currency, providers }: Props) {
  const [providerCode, setProviderCode] = useState<string | null>(
    providers.length === 1 ? providers[0].code : null
  );
  const [methodCode, setMethodCode] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(
    () => providers.find((p) => p.code === providerCode) ?? null,
    [providers, providerCode]
  );
  const method = useMemo(
    () => provider?.methods.find((m) => m.code === methodCode) ?? null,
    [provider, methodCode]
  );

  const phoneInvalid =
    method?.requiresPayerAccount === true && phone.trim() !== "" && !isValidPayerPhone(normalizePayerPhone(phone));

  const canSubmit =
    provider !== null && method !== null && !submitting && !phoneInvalid;

  function selectProvider(code: string) {
    setProviderCode(code);
    setMethodCode(null); // method choice resets when the provider changes
    setError(null);
  }

  async function handlePay() {
    if (!provider || !method) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = tokenFromLocation();
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerCode: provider.code,
          paymentMethod: method.code,
          ...(method.requiresPayerAccount && phone.trim()
            ? { payerPhone: normalizePayerPhone(phone) }
            : {}),
        }),
      });
      const data = (await response.json()) as { redirectUrl?: string; error?: string };
      if (response.ok && data.redirectUrl) {
        setRedirecting(true);
        window.location.href = data.redirectUrl;
        return; // keep the loading state while the browser navigates away
      }
      setError(data.error ?? "Could not start the payment. Please try again.");
    } catch {
      setError("Network problem — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const payLabel = provider
    ? `Pay ${formatMoney(amount, currency)} with ${provider.name}`
    : `Pay ${formatMoney(amount, currency)}`;

  return (
    <section
      aria-labelledby="checkout-heading"
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2
        id="checkout-heading"
        className="flex items-center gap-2 text-base font-semibold text-navy-900"
      >
        <Lock className="h-4 w-4 text-brand-600" aria-hidden="true" />
        Pay this invoice online
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose how you would like to pay {formatMoney(amount, currency)} for{" "}
        {invoiceNumber}. You will complete the payment on the payment provider&apos;s
        own secure page.
      </p>

      {/* Step 1 — provider */}
      <fieldset className="mt-5">
        <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          1. Choose a payment provider
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment provider">
          {providers.map((p) => {
            const selected = p.code === providerCode;
            return (
              <label
                key={p.code}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  selected
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="payment-provider"
                  value={p.code}
                  checked={selected}
                  onChange={() => selectProvider(p.code)}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <ProviderIcon name={p.icon} className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy-900">{p.name}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{p.tagline}</span>
                </span>
                {selected && (
                  <ShieldCheck className="ml-auto h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Step 2 — method */}
      {provider && (
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            2. Choose how to pay
          </legend>
          <div className="mt-2 space-y-2" role="radiogroup" aria-label="Payment method">
            {provider.methods.map((m) => {
              const selected = m.code === methodCode;
              return (
                <label
                  key={m.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    selected
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                      : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={m.code}
                    checked={selected}
                    onChange={() => {
                      setMethodCode(m.code);
                      setError(null);
                    }}
                    className="sr-only"
                  />
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
                      selected ? "border-brand-600 bg-brand-600" : "border-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-navy-900">{m.label}</span>
                    {m.description && (
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                        {m.description}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Payer account (wallet methods, per WAAFI docs) */}
      {method?.requiresPayerAccount && (
        <div className="mt-5">
          <label
            htmlFor="payer-phone"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            3. Your mobile number
          </label>
          <input
            id="payer-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 252611111111"
            aria-describedby="payer-phone-hint"
            className={`mt-2 w-full rounded-xl border px-4 py-3 text-base text-navy-900 outline-none transition-colors placeholder:text-slate-400 focus:ring-2 ${
              phoneInvalid
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
            }`}
          />
          <p id="payer-phone-hint" className="mt-1.5 text-xs leading-relaxed text-slate-500">
            The wallet number that will pay, in international format without + (e.g.
            252611111111 for Somalia). It is pre-filled on the provider&apos;s page and
            cannot be changed there.
          </p>
          {phoneInvalid && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Enter digits only, 8–15 digits, starting with the country code.
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {/* Pay button */}
      <button
        type="button"
        onClick={handlePay}
        disabled={!canSubmit}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting || redirecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {redirecting ? "Redirecting to the secure payment page…" : "Starting your payment…"}
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" aria-hidden="true" />
            {payLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
        You will pay on {provider?.name ?? "the provider"}&apos;s secure page — QASADAN never
        sees your wallet or card details.
      </p>
    </section>
  );
}
