import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody } from "@/lib/admin/crud-helpers";
import { isCredentialEncryptionConfigured } from "@/lib/payments/crypto";
import { getProviderDefinition, listProviderDefinitions } from "@/lib/payments/registry";
import { toProviderPublicView } from "@/lib/payments/credentials";
import { addProviderSchema } from "@/lib/payments/schemas";

/**
 * Payment provider management (Phase 1).
 * ADMIN-only: these routes manage encrypted payment credentials.
 */

export async function GET() {
  return withAdmin(
    async () => {
      const rows = await db.paymentProvider.findMany({ orderBy: { createdAt: "asc" } });
      const addedCodes = new Set(rows.map((r) => r.code));

      return NextResponse.json({
        cryptoConfigured: isCredentialEncryptionConfigured(),
        providers: rows.map(toProviderPublicView),
        // Definitions the admin can still add (implemented + not yet added).
        catalog: listProviderDefinitions()
          .filter((d) => d.implemented && !addedCodes.has(d.code))
          .map((d) => ({
            code: d.code,
            name: d.name,
            tagline: d.tagline,
            description: d.description,
            icon: d.icon,
            methods: d.methods.map((m) => m.label),
          })),
        // Planned integrations — visible to communicate extensibility.
        comingSoon: listProviderDefinitions()
          .filter((d) => !d.implemented)
          .map((d) => ({ code: d.code, name: d.name, tagline: d.tagline, icon: d.icon })),
      });
    },
    { roles: ["ADMIN"] }
  );
}

export async function POST(request: NextRequest) {
  return withAdmin(
    async () => {
      const parsed = await parseBody(request, addProviderSchema);
      if ("error" in parsed) return parsed.error;
      const { code } = parsed.data;

      const def = getProviderDefinition(code);
      if (!def || !def.implemented) {
        return NextResponse.json(
          { error: "This provider is not available yet." },
          { status: 400 }
        );
      }

      const existing = await db.paymentProvider.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json(
          { error: `${def.name} has already been added.` },
          { status: 409 }
        );
      }

      const row = await db.paymentProvider.create({
        data: {
          code,
          isSandbox: def.defaultSandbox,
          methods: JSON.stringify(def.defaultMethods),
          currencies: JSON.stringify(def.defaultCurrencies),
        },
      });

      return NextResponse.json(
        { provider: toProviderPublicView(row) },
        { status: 201 }
      );
    },
    { roles: ["ADMIN"] }
  );
}
