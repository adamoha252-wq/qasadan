import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { inquiryStatusSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, inquiryStatusSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return notFound("Inquiry");

    const inquiry = await db.inquiry.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ inquiry });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const existing = await db.inquiry.findUnique({ where: { id } });
    if (!existing) return notFound("Inquiry");
    await db.inquiry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
