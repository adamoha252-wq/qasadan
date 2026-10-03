import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, withAdminR, parseBody } from "@/lib/admin/crud-helpers";
import { projectSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdmin(async () => {
    const projects = await db.project.findMany({
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
      include: { images: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ projects });
  });
}

export async function POST(request: NextRequest) {
  return withAdminR(async () => {
    const parsed = await parseBody(request, projectSchema);
    if ("error" in parsed) return parsed.error;

    const { completedAt, externalUrl, coverImage, technologies, ...rest } = parsed.data;
    const project = await db.project.create({
      data: {
        ...rest,
        technologies: JSON.stringify(technologies),
        externalUrl: externalUrl || null,
        coverImage: coverImage || null,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  });
}
