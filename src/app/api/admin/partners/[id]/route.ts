import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, withAdminR, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { partnerSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const partner = await db.partner.findUnique({ where: { id } });
    if (!partner) return notFound("Partner");
    return NextResponse.json({ partner });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, partnerSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.partner.findUnique({ where: { id } });
    if (!existing) return notFound("Partner");

    const { category, logoUrl, websiteUrl, ...rest } = parsed.data;
    const partner = await db.partner.update({
      where: { id },
      data: {
        ...rest,
        category: category || null,
        logoUrl: logoUrl || null,
        websiteUrl: websiteUrl || null,
      },
    });
    return NextResponse.json({ partner });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const existing = await db.partner.findUnique({ where: { id } });
    if (!existing) return notFound("Partner");
    await db.partner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
