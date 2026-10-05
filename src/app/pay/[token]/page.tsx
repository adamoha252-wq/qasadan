import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { CheckoutPanel } from "@/components/site/checkout-panel";
import { PaymentStatusPanel } from "@/components/site/payment-status-panel";
import { findInvoiceClientViewByToken } from "@/lib/payments/invoices";
import { getCheckoutOptions } from "@/lib/payments/checkout";
import { findReceiptViewByToken } from "@/lib/payments/verification";
import {
  formatInvoiceDate,
  formatMoney,
  invoiceStatusLabel,
  type InvoiceClientView,
} from "@/lib/payments/invoice-types";

/**
 * QASADAN Secure Checkout — public invoice payment page.
 *
 * The 192-bit token in the URL IS the authorization (same model as Stripe
 * payment links). Unknown tokens render an identical 404 — no existence leak.
 * The page is dynamic (never cached: payment status must be current) and
 * excluded from search engines.
 *
 * Phase 3 mounts the provider/method selection + Pay Now flow (CheckoutPanel)
 * on this page for payable invoices; a processing invoice offers a resume
 * link to the in-flight provider checkout.
 *
 * Phase 4 adds the verified success panel (spec §7 — invoice number,
 * amount, provider, transaction id, date, receipt download) and the
 * "Check payment status" verification flow while an invoice is processing.
 */

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** noindex everywhere — payment links must never be indexed or cached. */
const ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  noarchive: true,
  nocache: true,
};

const FALLBACK_METADATA: Metadata = {
  title: "Secure Checkout — QASADAN",
  description: "QASADAN secure invoice payment page.",
  robots: ROBOTS,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const invoice = await findInvoiceClientViewByToken(token);
  if (!invoice) return FALLBACK_METADATA; // unknown token — same generic metadata, no leak
  return {
    ...FALLBACK_METADATA,
    title: `${invoice.invoiceNumber} — QASADAN Secure Checkout`,
  };
}

type Banner = {
  icon: React.ReactNode;
  title: string;
  text: string;
  className: string;
  iconClass: string;
};

function statusBanner(invoice: InvoiceClientView): Banner {
  switch (invoice.status) {
    case "PAID":
      return {
        icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
        title: "This invoice has been paid",
        text: invoice.paidAt
          ? `Payment confirmed on ${formatInvoiceDate(invoice.paidAt)}. Thank you!`
          : "Payment confirmed. Thank you!",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        iconClass: "text-emerald-600",
      };
    case "PROCESSING":
      return {
        icon: <RefreshCw className="h-5 w-5" aria-hidden="true" />,
        title: "Payment is being processed",
        text: "Your payment was received and is being verified. You can check this page again shortly.",
        className: "border-sky-200 bg-sky-50 text-sky-900",
        iconClass: "text-sky-600",
      };
    case "FAILED":
      return {
        icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
        title: "A payment attempt failed",
        text: "No money has left your account for the failed attempt. Please contact us to complete this payment.",
        className: "border-red-200 bg-red-50 text-red-900",
        iconClass: "text-red-600",
      };
    case "CANCELLED":
      return {
        icon: <XCircle className="h-5 w-5" aria-hidden="true" />,
        title: "This invoice was cancelled",
        text: "It no longer accepts payments. If you believe this is a mistake, contact QASADAN.",
        className: "border-slate-200 bg-slate-100 text-slate-700",
        iconClass: "text-slate-500",
      };
    case "EXPIRED":
      return {
        icon: <Calendar className="h-5 w-5" aria-hidden="true" />,
        title: "This payment link has expired",
        text: "Please contact QASADAN to request a fresh payment link.",
        className: "border-orange-200 bg-orange-50 text-orange-900",
        iconClass: "text-orange-600",
      };
    case "REFUNDED":
      return {
        icon: <RefreshCw className="h-5 w-5" aria-hidden="true" />,
        title: "This invoice was refunded",
        text: "The payment for this invoice has been refunded.",
        className: "border-violet-200 bg-violet-50 text-violet-900",
        iconClass: "text-violet-600",
      };
    default:
      return {
        icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" />,
        title: invoice.overdue ? "Payment overdue" : "Awaiting payment",
        text: invoice.overdue
          ? "This invoice is past its due date. Please contact QASADAN to arrange payment."
          : "Secure online payment for this invoice is being finalized — QASADAN will share payment access with you shortly.",
        className: "border-brand-200 bg-brand-50 text-brand-900",
        iconClass: "text-brand-600",
      };
  }
}

function SuccessRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
  <div className="flex items-start justify-between gap-4 border-t border-emerald-100 py-2.5 first:border-0">
    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-emerald-700/70">{label}</dt>
    <dd className="min-w-0 text-right text-sm font-medium text-emerald-900">{children}</dd>
  </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="w-36 shrink-0 text-sm font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-navy-900 sm:text-right">{children}</dd>
    </div>
  );
}

export default async function SecureCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const invoice = await findInvoiceClientViewByToken(token);
  if (!invoice) notFound();

  // Checkout options are computed from live state (provider activation,
  // enabled methods, currency). Both helpers return sanitized, serializable
  // data only — safe to render into the RSC stream.
  const checkout = await getCheckoutOptions(token);
  const returned = await searchParams;
  const returnedParam =
    returned.returned === "success"
      ? "success"
      : returned.returned === "failure"
        ? "failure"
        : null;

  // Verified payment data for the success panel (spec §7). Null for a PAID
  // invoice without a verified attempt (e.g. marked manually) — the panel
  // then renders without the provider/transaction rows.
  const receipt = invoice.status === "PAID" ? await findReceiptViewByToken(token) : null;

  const banner = invoice.status === "PAID" ? null : statusBanner(invoice);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <h1 className="flex items-center gap-2 text-xl font-bold text-navy-900">
            <Lock className="h-5 w-5 text-brand-600" aria-hidden="true" />
            QASADAN Secure Checkout
          </h1>
          <p className="text-sm text-slate-500">
            A private, secure payment link issued by QASADAN Web Development Agency.
          </p>
        </div>

        {/* Status banner (PAID renders the success panel below instead) */}
        {banner && (
          <div
            role="status"
            className={`mb-4 flex items-start gap-3 rounded-xl border p-4 ${banner.className}`}
          >
            <span className={`mt-0.5 shrink-0 ${banner.iconClass}`}>{banner.icon}</span>
            <div>
              <p className="text-sm font-semibold">{banner.title}</p>
              <p className="mt-0.5 text-sm opacity-90">{banner.text}</p>
            </div>
          </div>
        )}

        {/* Phase 4 — verified payment success panel (spec §7) */}
        {invoice.status === "PAID" && (
          <section
            aria-labelledby="payment-success-heading"
            className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-sm sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-inner"
                aria-hidden="true"
              >
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h2 id="payment-success-heading" className="text-lg font-bold">
                  ✓ Payment Successful
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-800/90">
                  Thank you{invoice.clientName ? `, ${invoice.clientName}` : ""}! Your payment
                  for invoice {invoice.invoiceNumber} has been received and verified.
                </p>
              </div>
            </div>

            {receipt && (
              <dl className="mt-4">
                <SuccessRow label="Invoice">{receipt.invoiceNumber}</SuccessRow>
                <SuccessRow label="Amount">
                  {formatMoney(receipt.amount, receipt.currency)}
                </SuccessRow>
                <SuccessRow label="Provider">
                  {receipt.providerName} — {receipt.methodLabel}
                </SuccessRow>
                <SuccessRow label="Transaction ID">
                  {receipt.transactionId ?? "—"}
                </SuccessRow>
                <SuccessRow label="Date">{receipt.paidAtLabel}</SuccessRow>
              </dl>
            )}

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={`/api/pay/${encodeURIComponent(token)}/receipt`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Download Receipt
              </a>
              <a
                href="#invoice"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
 View Invoice
              </a>
            </div>
            {!receipt && (
              <p className="mt-3 text-xs leading-relaxed text-emerald-800/80">
                A downloadable receipt becomes available once the payment record is
                finalized. Need it now? Contact QASADAN and we will email it to you.
              </p>
            )}
          </section>
        )}

        {/* Return-from-provider notice (added by the payment callback).
            Hidden once PAID — the success panel above is the final word. */}
        {returnedParam === "success" && invoice.status !== "PAID" && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">Payment submitted</p>
              <p className="mt-0.5 text-sm opacity-90">
                If you completed your payment, it is now being verified — this page will
                reflect the result shortly. You can safely close this page.
              </p>
            </div>
          </div>
        )}
        {returnedParam === "failure" && (
          <div
            role="status"
            className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">The payment was not completed</p>
              <p className="mt-0.5 text-sm opacity-90">
                No money has left your account. You can try again below or contact QASADAN for
                help.
              </p>
            </div>
          </div>
        )}

        {/* Invoice card */}
        <article id="invoice" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Invoice {invoice.invoiceNumber}
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                invoice.status === "PAID"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : invoice.status === "PENDING"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {invoiceStatusLabel(invoice.status)}
            </span>
          </header>

          {/* Amount */}
          <div className="my-4 rounded-xl bg-navy-900 px-5 py-5 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-navy-300">
              {invoice.status === "PAID" ? "Amount paid" : "Amount due"}
            </p>
            <p className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
              {formatMoney(invoice.amount, invoice.currency)}
            </p>
            {invoice.overdue && (
              <p className="mt-1 text-xs font-medium text-amber-400">
                Past due date — please contact us
              </p>
            )}
          </div>

          <dl>
            <SummaryRow label="Billed to">{invoice.clientName}</SummaryRow>
            <SummaryRow label="For">{invoice.projectService}</SummaryRow>
            {invoice.description && (
              <SummaryRow label="Details">
                <span className="whitespace-pre-line">{invoice.description}</span>
              </SummaryRow>
            )}
            <SummaryRow label="Issued">{formatInvoiceDate(invoice.createdAt)}</SummaryRow>
            <SummaryRow label="Due date">
              {formatInvoiceDate(invoice.dueDate)}
              {invoice.overdue && (
                <span className="ml-1.5 text-xs font-medium text-red-600">overdue</span>
              )}
            </SummaryRow>
          </dl>

          {invoice.status === "PENDING" && !invoice.overdue && checkout !== null && !checkout.payable && (
            <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
              Online payment for this invoice is not active yet. QASADAN will let you know
              when and how to pay — no action is needed from you right now.
            </p>
          )}
        </article>

        {/* Phase 3 — resume an in-flight provider checkout (PROCESSING invoice) */}
        {checkout?.resumeUrl && (
          <section
            aria-labelledby="resume-heading"
            className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:p-6"
          >
            <h2
              id="resume-heading"
              className="flex items-center gap-2 text-base font-semibold text-sky-900"
            >
              <RefreshCw className="h-4 w-4 text-sky-600" aria-hidden="true" />
              Your payment is already in progress
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-sky-900/80">
              A secure payment session was started for this invoice. Continue on the
              provider&apos;s payment page to finish — starting over is not needed.
            </p>
            <a
              href={checkout.resumeUrl}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              Continue payment
            </a>
          </section>
        )}

        {/* Phase 3 — public provider + method selection and Pay Now (spec §4) */}
        {checkout?.payable && checkout.providers.length > 0 && (
          <CheckoutPanel
            invoiceNumber={invoice.invoiceNumber}
            amount={invoice.amount}
            currency={invoice.currency}
            providers={checkout.providers}
          />
        )}

        {/* Phase 4 — verify a processing payment (spec §5); auto-runs when
            returning from the provider's success callback */}
        {invoice.status === "PROCESSING" && (
          <PaymentStatusPanel autoVerify={returnedParam === "success"} />
        )}

        {/* Footer help */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Payments are verified server-side — your payment details never pass through this
            page unprotected.
          </p>
          <p>
            Something look wrong?{" "}
            <Link
              href="/contact"
              className="font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              Contact QASADAN
            </Link>{" "}
            before paying, or email{" "}
            <a
              href="mailto:info@qasadan.com"
              className="inline-flex items-center gap-1 font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              <Mail className="h-3 w-3" aria-hidden="true" />
              info@qasadan.com
            </a>
            .
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
