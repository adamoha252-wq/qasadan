import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { PaymentsCryptoError } from "@/lib/payments/crypto";
import { getProviderDefinition } from "@/lib/payments/registry";
import {
  applyCredentialPatch,
  loadCredentials,
  saveCredentials,
  toProviderPublicView,
} from "@/lib/payments/credentials";
import { updateProviderSchema } from "@/lib/payments/schemas";
import { validateWaafiFormats } from "@/lib/payments/waafipay";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await db.paymentProvider.findUnique({ where: { id } });
      if (!row) return notFound("Payment provider");
      return NextResponse.json({ provider: toProviderPublicView(row) });
    },
    { roles: ["ADMIN"] }
  );
}

export async function PUT(request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await db.paymentProvider.findUnique({ where: { id } });
      if (!row) return notFound("Payment provider");

      const def = getProviderDefinition(row.code);
      if (!def) {
        return NextResponse.json(
          { error: "This provider is no longer supported by the system." },
          { status: 409 }
        );
      }

      const parsed = await parseBody(request, updateProviderSchema);
      if ("error" in parsed) return parsed.error;
      const { isSandbox, isActive, methods, currencies, credentials } = parsed.data;

      // ---- Registry-driven validation ----
      if (methods) {
        const allowed = new Set(def.methods.map((m) => m.code));
        const bad = methods.filter((m) => !allowed.has(m));
        if (bad.length > 0) {
          return NextResponse.json(
            { error: `Unsupported payment method(s): ${bad.join(", ")}` },
            { status: 400 }
          );
        }
      }
      if (currencies) {
        const allowed = new Set(def.currencies.map((c) => c.code));
        const bad = currencies.filter((c) => !allowed.has(c.toUpperCase()));
        if (bad.length > 0) {
          return NextResponse.json(
            { error: `Unsupported currency(ies): ${bad.join(", ")}` },
            { status: 400 }
          );
        }
      }

      const credentialPatch = credentials ?? null;
      if (credentialPatch) {
        const allowedKeys = new Set(def.credentialFields.map((f) => f.key));
        const badKeys = Object.keys(credentialPatch).filter((k) => !allowedKeys.has(k));
        if (badKeys.length > 0) {
          return NextResponse.json(
            { error: `Unknown credential field(s): ${badKeys.join(", ")}` },
            { status: 400 }
          );
        }
      }

      // ---- Credentials (encrypted at rest) ----
      let credentialsChanged = false;
      if (credentialPatch && Object.keys(credentialPatch).length > 0) {
        const { values: current } = loadCredentials(row);
        const merged = applyCredentialPatch(current, credentialPatch);

        // Format sanity check before storing (definitive check = Test Connection).
        if (row.code === "waafipay") {
          const problems = validateWaafiFormats(merged);
          if (problems.length > 0) {
            return NextResponse.json(
              { error: `Credential format problem — ${problems.join(" ")}` },
              { status: 400 }
            );
          }
        }

        try {
          await saveCredentials(row.id, merged);
          credentialsChanged = true;
        } catch (error) {
          if (error instanceof PaymentsCryptoError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
          throw error;
        }
      }

      // ---- Remaining fields ----
      // Any credential or environment change invalidates the previous test.
      const envChanged = isSandbox !== undefined && isSandbox !== row.isSandbox;
      const resetTest = credentialsChanged || envChanged;

      const updated = await db.paymentProvider.update({
        where: { id: row.id },
        data: {
          ...(isSandbox !== undefined ? { isSandbox } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          ...(methods ? { methods: JSON.stringify(methods) } : {}),
          ...(currencies ? { currencies: JSON.stringify(currencies.map((c) => c.toUpperCase())) } : {}),
          ...(resetTest
            ? { lastTestedAt: null, lastTestOutcome: null, lastTestMsg: null }
            : {}),
        },
      });

      return NextResponse.json({ provider: toProviderPublicView(updated) });
    },
    { roles: ["ADMIN"] }
  );
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdmin(
    async () => {
      const { id } = await params;
      const row = await db.paymentProvider.findUnique({ where: { id } });
      if (!row) return notFound("Payment provider");

      // NOTE (Phase 3+): once transactions exist, block deletion when the
      // provider has recorded payments — deactivate instead.
      await db.paymentProvider.delete({ where: { id } });
      return NextResponse.json({ success: true });
    },
    { roles: ["ADMIN"] }
  );
}
