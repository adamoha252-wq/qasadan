/**
 * Local mock of the WAAFI Pay unified /asm endpoint — used ONLY for
 * automated end-to-end tests of the payment flow (the real sandbox rejects
 * the dummy preview credentials, so the verified-PAID path cannot be
 * exercised against it).
 *
 * It speaks EXACTLY the documented envelope (docs.waafipay.com):
 *   WEBHOOK_LIST      → 2001 (read-only auth check)
 *   HPP_PURCHASE      → params.hppUrl / orderId / referenceId
 *   HPP_GETTRANINFO   → params.status/amount/currency/transactionId/…
 *
 * Scenario is controlled by the file db/mock-waafi-mode.txt:
 *   approve     — transactions report status "Approved" with the amount
 *                 read from the local DB (guarantees a matching snapshot)
 *   decline     — status "Declined"
 *   mismatch    — "Approved" but amount 999.99 (verification must flag it)
 *   auth-error  — responseCode 5001 / errorCode 1001 (credentials rejected)
 *
 * Run:  bun scripts/pay-mock-waafi.ts     (listens on 127.0.0.1:3999)
 */
/// <reference types="bun-types" />

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();
const PORT = 3999;
const MODE_FILE = join(process.cwd(), "db", "mock-waafi-mode.txt");

function readMode(): string {
  try {
    return readFileSync(MODE_FILE, "utf8").trim() || "approve";
  } catch {
    return "approve";
  }
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function envelope(responseCode: string, params?: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0",
    timestamp: new Date().toISOString(),
    responseId: String(Math.floor(Math.random() * 100000)),
    responseCode,
    errorCode: responseCode === "2001" ? "0" : "1001",
    responseMsg: responseCode === "2001" ? "RCS_SUCCESS" : "RCS_AUTHENTICATION_FAILED",
    ...(params ? { params } : {}),
    ...extra,
  };
}

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok");
    }
    if (request.method !== "POST" || !url.pathname.endsWith("/asm")) {
      return new Response("not found", { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      serviceName?: string;
      serviceParams?: Record<string, any>;
    };
    const serviceName = body.serviceName ?? "";
    const mode = readMode();
    // NEVER log serviceParams — they contain credentials.

    if (serviceName === "WEBHOOK_LIST") {
      if (mode === "auth-error") {
        return json(envelope("5001", undefined, { responseMsg: "Authentication failed" }));
      }
      return json(envelope("2001", { data: [] }));
    }

    if (serviceName === "HPP_PURCHASE") {
      if (mode === "auth-error") {
        return json(envelope("5001", undefined, { responseMsg: "Authentication failed" }));
      }
      const ref = body.serviceParams?.transactionInfo?.referenceId ?? `MOCK-${Date.now()}`;
      return json(
        envelope("2001", {
          hppUrl: `https://mock.waafipay.test/hpp?ref=${encodeURIComponent(String(ref))}`,
          orderId: `MOCK-ORD-${Date.now()}`,
          referenceId: ref,
        })
      );
    }

    if (serviceName === "HPP_GETTRANINFO") {
      const ref = body.serviceParams?.referenceId;
      const attempt =
        typeof ref === "string" ? await db.payment.findUnique({ where: { referenceId: ref } }) : null;
      if (mode === "auth-error") {
        return json(envelope("5001", undefined, { responseMsg: "Authentication failed" }));
      }
      if (!attempt) {
        return json(envelope("5202", undefined, { responseMsg: "RCS_TRAN_ALREADY_CANCELLED" }));
      }
      if (mode === "decline") {
        return json(
          envelope("2001", {
            tranStatusDesc: "Declined",
            status: "Declined",
            transactionId: "MOCK-DECLINED",
            referenceId: attempt.referenceId,
          })
        );
      }
      const amount = mode === "mismatch" ? "999.99" : attempt.amount.toFixed(2);
      return json(
        envelope("2001", {
          tranStatusDesc: "Approved",
          amount,
          payerId: "252700999999",
          paymentMethod: attempt.paymentMethod.toLowerCase(),
          description: "mock transaction",
          tranDate: new Date().toISOString(),
          currency: attempt.currency,
          invoiceId: attempt.referenceId,
          referenceId: attempt.referenceId,
          tranAmount: amount,
          transactionId: `MOCKTXN-${attempt.id.replace(/[^a-z0-9]/gi, "").slice(-8)}`,
          tranStatusId: "3",
          status: "Approved",
        })
      );
    }

    return json(envelope("5001", undefined, { responseMsg: "Unknown service" }));
  },
});

console.log(`[mock-waafi] listening on http://127.0.0.1:${PORT}/asm (mode file: ${MODE_FILE})`);

// Keep the process alive (Bun.serve already does; this is just a guard).
process.on("SIGTERM", () => {
  server.stop(true);
  process.exit(0);
});
