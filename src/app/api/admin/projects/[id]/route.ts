import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { projectSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      include: { images: { orderBy: { order: "asc" } } },
    });
    if (!project) return notFound("Project");
    return NextResponse.json({ project });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, projectSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) return notFound("Project");

    const { completedAt, externalUrl, coverImage, technologies, ...rest } = parsed.data;
    const project = await db.project.update({
      where: { id },
      data: {
        ...rest,
        technologies: JSON.stringify(technologies),
        externalUrl: externalUrl || null,
        coverImage: coverImage || null,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
    });
    return NextResponse.json({ project });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) return notFound("Project");
    await db.project.delete({ where: { id } }); // images cascade
    return NextResponse.json({ success: true });
  });
}
