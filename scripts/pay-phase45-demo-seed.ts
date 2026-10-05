/**
 * Seeds two DEMO invoices into the local preview DB so the admin/user can
 * visually explore the Phase 4/5 UI without a real WAAFI transaction:
 *
 *   1. "Demo Client (paid)"      — PAID invoice + SUCCEEDED attempt
 *      → shows the public success page (✓ Payment Successful) and enables
 *        the PDF receipt download.
 *   2. "Demo Client (processing)" — PROCESSING invoice + INITIATED attempt
 *      → shows the resume card + "Check payment status" verification panel.
 *
 * Idempotent: existing demo rows are replaced. Local preview DB only —
 * production data is untouched (see DEPLOYMENT.md).
 *
 *   bun scripts/pay-phase45-demo-seed.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const MARKER = "Demo Client";

async function upsertInvoice(params: {
  invoiceNumber: string;
  clientName: string;
  projectService: string;
  amount: number;
  currency: string;
  invoiceStatus: string;
  attempt: {
    status: string;
    method: string;
    referenceId: string;
    providerTxnId?: string;
    payerAccount?: string;
    hppUrl?: string;
    failureReason?: string;
  };
}) {
  await db.invoice.deleteMany({ where: { invoiceNumber: params.invoiceNumber } });
  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: params.invoiceNumber,
      token: `demo-${params.invoiceNumber.toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`,
      clientName: params.clientName,
      clientEmail: null,
      projectService: params.projectService,
      description: "Demo invoice seeded for previewing the payment UI. Safe to delete.",
      amount: params.amount,
      currency: params.currency,
      status: params.invoiceStatus,
      paidAt: params.invoiceStatus === "PAID" ? new Date() : null,
    },
  });
  await db.payment.create({
    data: {
      invoiceId: invoice.id,
      providerId: "demo-provider",
      providerCode: "waafipay",
      providerName: "WAAFI Pay",
      paymentMethod: params.attempt.method,
      amount: params.amount,
      currency: params.currency,
      status: params.attempt.status,
      referenceId: params.attempt.referenceId,
      providerTxnId: params.attempt.providerTxnId ?? null,
      payerAccount: params.attempt.payerAccount ?? null,
      hppUrl: params.attempt.hppUrl ?? null,
      verifiedAt: params.attempt.status === "SUCCEEDED" ? new Date() : null,
      failureReason: params.attempt.failureReason ?? null,
    },
  });
  console.log(JSON.stringify({ invoiceNumber: invoice.invoiceNumber, token: invoice.token, status: invoice.status }));
}

async function main() {
  // remove previous demo rows (invoices cascade-delete their payments)
  await db.invoice.deleteMany({ where: { clientName: { contains: MARKER } } });

  await upsertInvoice({
    invoiceNumber: "INV-2026-0090",
    clientName: "Demo Client (paid example)",
    projectService: "Website Redesign — Phase 2",
    amount: 450,
    currency: "USD",
    invoiceStatus: "PAID",
    attempt: {
      status: "SUCCEEDED",
      method: "MWALLET_ACCOUNT",
      referenceId: "QSD-INV-2026-0090-demo01",
      providerTxnId: "128394",
      payerAccount: "252612307888",
    },
  });

  await upsertInvoice({
    invoiceNumber: "INV-2026-0091",
    clientName: "Demo Client (processing example)",
    projectService: "Mobile App Maintenance Retainer",
    amount: 1200,
    currency: "SLSH",
    invoiceStatus: "PROCESSING",
    attempt: {
      status: "INITIATED",
      method: "MWALLET_ACCOUNT",
      referenceId: "QSD-INV-2026-0091-demo02",
      hppUrl: "https://sandbox.waafipay.com/hpp?demo",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
