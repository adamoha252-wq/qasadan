import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, withAdminR, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { siteStatSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const stat = await db.siteStat.findUnique({ where: { id } });
    if (!stat) return notFound("Stat");
    return NextResponse.json({ stat });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, siteStatSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.siteStat.findUnique({ where: { id } });
    if (!existing) return notFound("Stat");

    const stat = await db.siteStat.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ stat });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const existing = await db.siteStat.findUnique({ where: { id } });
    if (!existing) return notFound("Stat");
    await db.siteStat.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
