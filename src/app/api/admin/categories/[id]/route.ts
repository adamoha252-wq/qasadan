import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { categorySchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, categorySchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.newsCategory.findUnique({ where: { id } });
    if (!existing) return notFound("Category");

    const category = await db.newsCategory.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ category });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const existing = await db.newsCategory.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    });
    if (!existing) return notFound("Category");
    if (existing._count.articles > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${existing._count.articles} article(s) still use this category. Reassign them first.`,
        },
        { status: 409 }
      );
    }
    await db.newsCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
