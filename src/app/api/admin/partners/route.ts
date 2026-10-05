import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdminR, parseBody } from "@/lib/admin/crud-helpers";
import { partnerSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdminR(async () => {
    const partners = await db.partner.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ partners });
  });
}

export async function POST(request: NextRequest) {
  return withAdminR(async () => {
    const parsed = await parseBody(request, partnerSchema);
    if ("error" in parsed) return parsed.error;

    const { category, logoUrl, websiteUrl, ...rest } = parsed.data;
    const partner = await db.partner.create({
      data: {
        ...rest,
        category: category || null,
        logoUrl: logoUrl || null,
        websiteUrl: websiteUrl || null,
      },
    });
    return NextResponse.json({ partner }, { status: 201 });
  });
}
