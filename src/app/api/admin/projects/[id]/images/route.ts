import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { projectImageSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

/** Add an image to a project. */
export async function POST(request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) return notFound("Project");

    const parsed = await parseBody(request, projectImageSchema);
    if ("error" in parsed) return parsed.error;

    const image = await db.projectImage.create({
      data: {
        projectId: id,
        url: parsed.data.url,
        caption: parsed.data.caption || null,
        order: parsed.data.order,
      },
    });
    return NextResponse.json({ image }, { status: 201 });
  });
}

/** Replace the full image list of a project (simplest consistent sync from the editor). */
export async function PUT(request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) return notFound("Project");

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const list = Array.isArray((raw as { images?: unknown })?.images)
      ? ((raw as { images: unknown[] }).images)
      : null;
    if (!list) {
      return NextResponse.json({ error: "Expected { images: [...] }" }, { status: 400 });
    }
    const images: { url: string; caption: string | null; order: number }[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i] as Record<string, unknown>;
      if (typeof item?.url !== "string" || !item.url.trim()) {
        return NextResponse.json({ error: "Every image needs a URL" }, { status: 400 });
      }
      images.push({
        url: item.url.trim().slice(0, 500),
        caption: typeof item.caption === "string" ? item.caption.slice(0, 200) : null,
        order: typeof item.order === "number" ? item.order : i,
      });
    }

    await db.projectImage.deleteMany({ where: { projectId: id } });
    await db.projectImage.createMany({
      data: images.map((img, i) => ({ ...img, projectId: id, order: img.order ?? i })),
    });
    const updated = await db.projectImage.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ images: updated });
  });
}
