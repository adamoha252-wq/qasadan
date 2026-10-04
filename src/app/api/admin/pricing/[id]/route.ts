import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, withAdminR, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { pricingPlanSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const plan = await db.pricingPlan.findUnique({ where: { id } });
    if (!plan) return notFound("Pricing plan");
    return NextResponse.json({ plan });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, pricingPlanSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.pricingPlan.findUnique({ where: { id } });
    if (!existing) return notFound("Pricing plan");

    const { tagline, features, ...rest } = parsed.data;
    const plan = await db.pricingPlan.update({
      where: { id },
      data: {
        ...rest,
        tagline: tagline || null,
        features: JSON.stringify(features),
      },
    });
    return NextResponse.json({ plan });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const existing = await db.pricingPlan.findUnique({ where: { id } });
    if (!existing) return notFound("Pricing plan");
    await db.pricingPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
