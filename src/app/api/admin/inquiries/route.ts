import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin } from "@/lib/admin/crud-helpers";

export async function GET(request: NextRequest) {
  return withAdmin(async () => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const inquiries = await db.inquiry.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ inquiries });
  });
}
