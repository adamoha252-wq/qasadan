import { NextRequest, NextResponse } from "next/server";
import { findReceiptViewByToken } from "@/lib/payments/verification";
import { renderReceiptPdf } from "@/lib/payments/receipt";

/**
 * PUBLIC receipt download (Phase 4, spec §7 — "Download Receipt").
 *
 *   GET /api/pay/[token]/receipt
 *
 * The 192-bit token in the URL IS the authorization. A PDF is produced
 * ONLY for a PAID invoice with a verified (SUCCEEDED) payment — everything
 * else gets the same generic 404 (no existence leak). The receipt contains
 * exclusively verified, customer-facing data (see receipt.ts).
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const PDF_HEADERS = {
  "Content-Type": "application/pdf",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;

  const receipt = await findReceiptViewByToken(token);
  if (!receipt) {
    return NextResponse.json(
      { error: "Receipt not available — the payment has not been confirmed yet." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const pdf = await renderReceiptPdf(receipt);
    const filename = `QASADAN-Receipt-${receipt.invoiceNumber}.pdf`;
    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        ...PDF_HEADERS,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[payments] receipt rendering failed", error);
    return NextResponse.json(
      { error: "Could not generate the receipt — please try again." },
      { status: 500 }
    );
  }
}
