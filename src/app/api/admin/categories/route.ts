import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { categorySchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdmin(async () => {
    const categories = await db.newsCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { articles: true } } },
    });
    return NextResponse.json({ categories });
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(async () => {
    const parsed = await parseBody(request, categorySchema);
    if ("error" in parsed) return parsed.error;

    const category = await db.newsCategory.create({ data: parsed.data });
    return NextResponse.json({ category }, { status: 201 });
  });
}
