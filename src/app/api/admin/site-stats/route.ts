import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdminR, parseBody } from "@/lib/admin/crud-helpers";
import { siteStatSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdminR(async () => {
    const stats = await db.siteStat.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ stats });
  });
}

export async function POST(request: NextRequest) {
  return withAdminR(async () => {
    const parsed = await parseBody(request, siteStatSchema);
    if ("error" in parsed) return parsed.error;

    const stat = await db.siteStat.create({ data: parsed.data });
    return NextResponse.json({ stat }, { status: 201 });
  });
}
