import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  FileText,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { PlanCheckoutForm } from "@/components/site/plan-checkout-form";
import { getActivePricingPlanById } from "@/lib/data/public";
import { parsePlanPrice } from "@/lib/payments/plan-checkout";
import { listPublicProvidersForCurrency } from "@/lib/payments/checkout";
import { formatMoney } from "@/lib/payments/invoice-types";
import { siteConfig } from "@/lib/site";

/**
 * Public plan checkout (pricing section "Choose Plan" → this page → /pay/<token>).
 *
 * Step 1 of the public plan flow: the visitor confirms who the plan is for.
 * Submitting creates a PENDING invoice server-side and redirects to the
 * existing QASADAN Secure Checkout (/pay/<token>), where the customer picks
 * the payment provider and method — mobile wallets included — and pays.
 *
 * Design notes:
 *  - Standalone page (no site header/footer), same design language as /pay.
 *  - force-dynamic: provider activation + plan state must be current.
 *  - noindex: checkout pages must never be indexed or cached.
 *  - Unknown / inactive plan ids render the generic 404 — no existence leak.
 *  - Plans whose price does not parse to a number ("Custom") get a
 *    tailored-quote card instead of the order form (their pricing button
 *    keeps pointing to /contact, so normally they never land here).
 */

export const dynamic = "force-dynamic";

const ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  noarchive: true,
  nocache: true,
};

export const metadata: Metadata = {
  title: "Plan Checkout — QASADAN",
  description: "Order a QASADAN plan and pay securely online.",
  robots: ROBOTS,
};

type Props = { params: Promise<{ planId: string }> };

export default async function PlanCheckoutPage({ params }: Props) {
  const { planId } = await params;
  const plan = await getActivePricingPlanById(planId);
  if (!plan) notFound();

  const price = parsePlanPrice(plan.price);
  // Public provider catalog for the plan currency — same filter the payment
  // page uses (activated + credential-complete + method/currency enabled).
  const providers = price ? await listPublicProvidersForCurrency(price.currency) : [];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
        {/* Header — same design language as the /pay page */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <h1 className="flex items-center gap-2 text-xl font-bold text-navy-900">
            <Lock className="h-5 w-5 text-brand-600" aria-hidden="true" />
            QASADAN Secure Checkout
          </h1>
          <p className="text-sm text-slate-500">
            You are one step away from getting started — tell us who the plan is
            for, then choose how to pay.
          </p>
        </div>

        {/* Order summary */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Your order
            </div>
            {plan.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Most Popular
              </span>
            )}
          </header>

          <div className="mt-4">
            <h2 className="font-heading text-xl font-semibold text-navy-800">
              {plan.name}
            </h2>
            {plan.tagline && (
              <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
            )}
          </div>

          {price ? (
            <div className="my-4 rounded-xl bg-navy-900 px-5 py-5 text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-navy-300">
                Total today
              </p>
              <p className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
                {formatMoney(price.amount.toFixed(2), price.currency)}
              </p>
              <p className="mt-1 text-xs text-navy-300">/ {plan.period}</p>
            </div>
          ) : (
            <p className="my-4 rounded-xl bg-brand-50 px-5 py-4 text-center text-sm font-semibold text-brand-900">
              {plan.price} — tailored to your project
            </p>
          )}

          {plan.features.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-slate-600"
                >
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </article>

        {price ? (
          <>
            {/* Public payment-methods strip — the visitor sees how they can
                pay (incl. mobile wallets) before entering their details */}
            <section
              aria-labelledby="pay-methods-heading"
              className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2
                id="pay-methods-heading"
                className="flex items-center gap-2 text-base font-semibold text-navy-900"
              >
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Payment methods
              </h2>
              {providers.length > 0 ? (
                <>
                  <p className="mt-1 text-sm text-slate-500">
                    On the next step you choose a provider and how to pay:
                  </p>
                  <ul className="mt-3 space-y-2">
                    {providers.map((provider) => (
                      <li
                        key={provider.code}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-navy-900">
                          {provider.name}
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {provider.methods.map((method) => (
                            <li
                              key={method.code}
                              className="flex items-start gap-2 text-sm leading-snug text-slate-600"
                            >
                              <span
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
                                aria-hidden="true"
                              />
                              <span>
                                <span className="font-medium text-navy-900">
                                  {method.label}
                                </span>
                                {method.description ? ` — ${method.description}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                  Online payment for this plan is being set up right now. You can
                  still place your order — QASADAN will contact you to arrange
                  payment.
                </p>
              )}
            </section>

            {/* Step 1 — buyer details → creates the order, redirects to /pay */}
            <PlanCheckoutForm
              planId={plan.id}
              planName={plan.name}
              amount={price.amount.toFixed(2)}
              currency={price.currency}
            />
          </>
        ) : (
          /* Custom-priced plan — quote flow, no online order */
          <section
            aria-labelledby="quote-heading"
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 id="quote-heading" className="text-base font-semibold text-navy-900">
              Tailored to your project
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              The {plan.name} plan is quoted individually. Tell us about your
              project and QASADAN will send you a tailored quote together with a
              secure payment link.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Request a quote
              </Link>
              <a
                href={siteConfig.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </div>
          </section>
        )}

        {/* Footer help — mirrors /pay */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Payments are verified server-side — QASADAN never sees your wallet or
            card details.
          </p>
          <p>
            Changed your mind?{" "}
            <Link
              href="/#pricing"
              className="font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              Back to plans
            </Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} QASADAN Web Development Agency — Mogadishu, Somalia
        </p>
      </footer>
    </div>
  );
}
