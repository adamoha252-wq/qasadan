import "server-only";

/**
 * PDF receipt generator (Phase 4, spec §7 — "Download Receipt").
 *
 * Renders a clean, branded A4 receipt with pdf-lib (pure JavaScript — no
 * native dependencies, works on the Node/serverless runtime). Only verified
 * data is passed in by the caller (see findReceiptViewByToken): the PDF
 * never touches credentials or raw provider payloads.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { PaymentReceiptView } from "./payment-types";
import { formatMoney } from "./invoice-types";

/* QASADAN brand palette (globals.css) */
const NAVY_900 = rgb(0.031, 0.09, 0.161); // #081729
const NAVY_800 = rgb(0.043, 0.122, 0.227); // #0B1F3A
const NAVY_300 = rgb(0.561, 0.69, 0.824); // #8FB0D2
const BRAND_600 = rgb(0, 0.4, 0.8); // #0066CC
const BRAND_50 = rgb(0.933, 0.965, 1); // #EEF6FF
const EMERALD_600 = rgb(0.02, 0.588, 0.412); // #059669
const EMERALD_50 = rgb(0.925, 0.992, 0.961); // #ECFDF5
const SLATE_700 = rgb(0.286, 0.333, 0.412); // #475569
const SLATE_500 = rgb(0.447, 0.51, 0.584); // #727A95-ish
const SLATE_300 = rgb(0.831, 0.867, 0.902); // #D4DAE6-ish
const WHITE = rgb(1, 1, 1);

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;

/**
 * pdf-lib standard fonts encode WinAnsi — characters outside it throw.
 * Everything the customer typed (names, descriptions) is sanitized; any
 * character WinAnsi cannot represent becomes "?".
 */
function san(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    if (ch === "\n" || ch === "\t" || ch === " ") {
      out += ch === "\t" ? " " : ch;
    } else if (code >= 32 && code <= 126) {
      out += ch; // printable ASCII — always safe
    } else if (code >= 160 && code <= 255) {
      out += ch; // Latin-1 supplement — safe in WinAnsi
    } else {
      out += "?";
    }
  }
  return out;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = san(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 12); // hard cap — receipts stay on one page
}

/** "INV-2026-0003" → "RCP-2026-0003" */
function receiptNumber(invoiceNumber: string): string {
  return san(invoiceNumber).replace(/^INV-/i, "RCP-");
}

/** Draws a green check inside a circle (success mark of the receipt). */
function drawSuccessCheck(page: PDFPage, cx: number, cy: number, radius: number) {
  page.drawCircle({ x: cx, y: cy, size: radius, color: EMERALD_600 });
  const s = radius * 0.5;
  const points: Array<[number, number, number, number]> = [
    [cx - s * 0.9, cy, cx - s * 0.15, cy - s * 0.75],
    [cx - s * 0.15, cy - s * 0.75, cx + s, cy + s * 0.65],
  ];
  for (const [x1, y1, x2, y2] of points) {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: radius * 0.28,
      color: WHITE,
      lineCap: 1, // round
    });
  }
}

export async function renderReceiptPdf(receipt: PaymentReceiptView): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`QASADAN Receipt ${receiptNumber(receipt.invoiceNumber)}`);
  doc.setCreator("QASADAN Web Development Agency");
  doc.setProducer("QASADAN payment system");
  doc.setCreationDate(new Date());

  const page = doc.addPage(A4);
  const [w, h] = A4;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  /* ---------- header band ---------- */
  const bandHeight = 86;
  page.drawRectangle({ x: 0, y: h - bandHeight, width: w, height: bandHeight, color: NAVY_900 });
  page.drawRectangle({ x: 0, y: h - bandHeight, width: w, height: 3, color: BRAND_600 });

  page.drawText(san("QASADAN"), {
    x: MARGIN,
    y: h - 38,
    size: 22,
    font: bold,
    color: WHITE,
  });
  page.drawText(san("Web Development Agency"), {
    x: MARGIN,
    y: h - 54,
    size: 9,
    font,
    color: NAVY_300,
  });
  const receiptTitle = san("PAYMENT RECEIPT");
  page.drawText(receiptTitle, {
    x: w - MARGIN - bold.widthOfTextAtSize(receiptTitle, 14),
    y: h - 38,
    size: 14,
    font: bold,
    color: WHITE,
  });
  const receiptNo = san(`No. ${receiptNumber(receipt.invoiceNumber)}`);
  page.drawText(receiptNo, {
    x: w - MARGIN - font.widthOfTextAtSize(receiptNo, 9),
    y: h - 54,
    size: 9,
    font,
    color: NAVY_300,
  });

  /* ---------- paid badge ---------- */
  let y = h - bandHeight - 40;
  drawSuccessCheck(page, MARGIN + 11, y + 6, 11);
  page.drawText(san("Payment Successful"), {
    x: MARGIN + 30,
    y,
    size: 15,
    font: bold,
    color: EMERALD_600,
  });
  const issuedLabel = san(`Issued ${receipt.paidAtLabel}`);
  page.drawText(issuedLabel, {
    x: w - MARGIN - font.widthOfTextAtSize(issuedLabel, 9.5),
    y: y + 3,
    size: 9.5,
    font,
    color: SLATE_500,
  });

  /* ---------- billed-to block ---------- */
  y -= 34;
  const textWidth = w - MARGIN * 2;

  page.drawText(san("BILLED TO"), { x: MARGIN, y, size: 8, font: bold, color: SLATE_500 });
  y -= 16;
  page.drawText(san(receipt.clientName), {
    x: MARGIN,
    y,
    size: 12,
    font: bold,
    color: NAVY_800,
  });
  y -= 16;
  for (const line of wrapText(receipt.projectService, font, 10, textWidth)) {
    page.drawText(line, { x: MARGIN, y, size: 10, font, color: SLATE_700 });
    y -= 13;
  }

  /* ---------- amount paid box ---------- */
  y -= 14;
  const boxHeight = 74;
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: textWidth,
    height: boxHeight,
    color: BRAND_50,
    borderColor: BRAND_600,
    borderWidth: 1,
  });
  page.drawText(san("AMOUNT PAID"), {
    x: w / 2 - font.widthOfTextAtSize(san("AMOUNT PAID"), 8.5) / 2,
    y: y - 22,
    size: 8.5,
    font: bold,
    color: BRAND_600,
  });
  const amountText = san(formatMoney(receipt.amount, receipt.currency));
  page.drawText(amountText, {
    x: w / 2 - bold.widthOfTextAtSize(amountText, 24) / 2,
    y: y - 52,
    size: 24,
    font: bold,
    color: NAVY_900,
  });
  y -= boxHeight + 26;

  /* ---------- payment details rows ---------- */
  const rows: Array<[string, string]> = [
    ["Invoice number", san(receipt.invoiceNumber)],
    ["Provider", san(receipt.providerName)],
    ["Payment method", san(`${receipt.providerName} — ${receipt.methodLabel}`)],
    ["Transaction ID", receipt.transactionId ? san(receipt.transactionId) : "—"],
    ["Paid on", san(receipt.paidAtLabel)],
  ];
  for (const [label, value] of rows) {
    page.drawText(san(label), { x: MARGIN, y, size: 10, font, color: SLATE_500 });
    const valueText = value;
    page.drawText(valueText, {
      x: w - MARGIN - font.widthOfTextAtSize(valueText, 10.5),
      y: y - 0.5,
      size: 10.5,
      font: bold,
      color: NAVY_800,
    });
    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: w - MARGIN, y },
      thickness: 0.5,
      color: SLATE_300,
    });
    y -= 18;
  }

  /* ---------- thank-you + footer ---------- */
  y -= 10;
  page.drawText(san("Thank you for your business!"), {
    x: MARGIN,
    y,
    size: 12,
    font: bold,
    color: NAVY_800,
  });
  y -= 16;
  for (const line of wrapText(
    "This receipt was issued electronically by the QASADAN payment system after the payment was verified with the payment provider. It is valid without a signature.",
    font,
    9,
    textWidth
  )) {
    page.drawText(line, { x: MARGIN, y, size: 9, font, color: SLATE_500 });
    y -= 12;
  }

  const footerY = 42;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 18 },
    end: { x: w - MARGIN, y: footerY + 18 },
    thickness: 0.5,
    color: SLATE_300,
  });
  const footer = san("QASADAN Web Development Agency — Mogadishu, Somalia");
  page.drawText(footer, {
    x: w / 2 - font.widthOfTextAtSize(footer, 8.5) / 2,
    y: footerY,
    size: 8.5,
    font,
    color: SLATE_500,
  });
  const footer2 = san("qasadan.vercel.app  ·  info@qasadan.com");
  page.drawText(footer2, {
    x: w / 2 - font.widthOfTextAtSize(footer2, 8.5) / 2,
    y: footerY - 13,
    size: 8.5,
    font,
    color: BRAND_600,
  });

  return doc.save();
}
