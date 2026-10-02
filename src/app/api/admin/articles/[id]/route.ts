import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { articleSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const article = await db.newsArticle.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!article) return notFound("Article");
    return NextResponse.json({ article });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, articleSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.newsArticle.findUnique({ where: { id } });
    if (!existing) return notFound("Article");

    const { categoryId, coverImage, ...rest } = parsed.data;
    const article = await db.newsArticle.update({
      where: { id },
      data: {
        ...rest,
        coverImage: coverImage || null,
        categoryId: categoryId || null,
        // Set publishedAt on first publish; keep original date on subsequent saves
        ...(parsed.data.isPublished && !existing.isPublished && !existing.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      },
      include: { category: true },
    });
    return NextResponse.json({ article });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const existing = await db.newsArticle.findUnique({ where: { id } });
    if (!existing) return notFound("Article");
    await db.newsArticle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
