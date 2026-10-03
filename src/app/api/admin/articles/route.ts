import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, withAdminR, parseBody } from "@/lib/admin/crud-helpers";
import { articleSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdmin(async () => {
    const articles = await db.newsArticle.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { category: true },
    });
    return NextResponse.json({ articles });
  });
}

export async function POST(request: NextRequest) {
  return withAdminR(async () => {
    const parsed = await parseBody(request, articleSchema);
    if ("error" in parsed) return parsed.error;

    const { categoryId, coverImage, ...rest } = parsed.data;
    const article = await db.newsArticle.create({
      data: {
        ...rest,
        coverImage: coverImage || null,
        categoryId: categoryId || null,
        publishedAt: parsed.data.isPublished ? new Date() : null,
      },
      include: { category: true },
    });
    return NextResponse.json({ article }, { status: 201 });
  });
}
