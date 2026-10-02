import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { serviceSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const service = await db.service.findUnique({ where: { id } });
    if (!service) return notFound("Service");
    return NextResponse.json({ service });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, serviceSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) return notFound("Service");

    const { imageUrl, ...rest } = parsed.data;
    const service = await db.service.update({
      where: { id },
      data: { ...rest, imageUrl: imageUrl || null, features: JSON.stringify(parsed.data.features) },
    });
    return NextResponse.json({ service });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) return notFound("Service");
    await db.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
