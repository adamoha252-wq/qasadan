import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, withAdminR, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { testimonialSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const testimonial = await db.testimonial.findUnique({ where: { id } });
    if (!testimonial) return notFound("Testimonial");
    return NextResponse.json({ testimonial });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, testimonialSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.testimonial.findUnique({ where: { id } });
    if (!existing) return notFound("Testimonial");

    const { clientRole, company, imageUrl, ...rest } = parsed.data;
    const testimonial = await db.testimonial.update({
      where: { id },
      data: {
        ...rest,
        clientRole: clientRole || null,
        company: company || null,
        imageUrl: imageUrl || null,
      },
    });
    return NextResponse.json({ testimonial });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const existing = await db.testimonial.findUnique({ where: { id } });
    if (!existing) return notFound("Testimonial");
    await db.testimonial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
