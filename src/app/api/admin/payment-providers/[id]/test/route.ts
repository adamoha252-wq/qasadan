import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, notFound } from "@/lib/admin/crud-helpers";
import { loadCredentials } from "@/lib/payments/credentials";
import { testWaafiConnection } from "@/lib/payments/waafipay";

type Params = { params: Promise<{ id: string }> };

/**
 * Test Connection — performs a LIVE, read-only call to the provider.
 * For WAAFI Pay this is WEBHOOK_LIST (authenticates the merchant
 * credentials without touching any payment).
 */

export async function POST(_request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await db.paymentProvider.findUnique({ where: { id } });
      if (!row) return notFound("Payment provider");

      const { values, error: decryptError } = loadCredentials(row);
      if (decryptError) {
        return NextResponse.json({ error: decryptError }, { status: 500 });
      }
      if (Object.keys(values).length === 0) {
        return NextResponse.json(
          { error: "No credentials configured yet — open Configure and add them first." },
          { status: 400 }
        );
      }

      let result: { outcome: "PASS" | "PARTIAL" | "FAIL"; message: string };
      if (row.code === "waafipay") {
        result = await testWaafiConnection(
          {
            merchantUid: values.merchantUid,
            storeId: values.storeId,
            hppKey: values.hppKey,
            apiUserId: values.apiUserId,
            apiKey: values.apiKey,
          },
          row.isSandbox
        );
      } else {
        result = {
          outcome: "FAIL",
          message: "Test connection is not implemented for this provider yet.",
        };
      }

      // Persist the outcome so the provider card always shows the latest state.
      const updated = await db.paymentProvider.update({
        where: { id: row.id },
        data: {
          lastTestedAt: new Date(),
          lastTestOutcome: result.outcome,
          lastTestMsg: result.message,
        },
      });

      return NextResponse.json({
        outcome: result.outcome,
        message: result.message,
        testedAt: updated.lastTestedAt!.toISOString(),
      });
    },
    { roles: ["ADMIN"] }
  );
}
