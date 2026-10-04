import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdminR, parseBody } from "@/lib/admin/crud-helpers";
import { pricingPlanSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdminR(async () => {
    const plans = await db.pricingPlan.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ plans });
  });
}

export async function POST(request: NextRequest) {
  return withAdminR(async () => {
    const parsed = await parseBody(request, pricingPlanSchema);
    if ("error" in parsed) return parsed.error;

    const { tagline, features, ...rest } = parsed.data;
    const plan = await db.pricingPlan.create({
      data: {
        ...rest,
        tagline: tagline || null,
        features: JSON.stringify(features),
      },
    });
    return NextResponse.json({ plan }, { status: 201 });
  });
}
