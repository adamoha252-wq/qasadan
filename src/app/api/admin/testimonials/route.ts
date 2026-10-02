import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody } from "@/lib/admin/crud-helpers";
import { testimonialSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdmin(async () => {
    const testimonials = await db.testimonial.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ testimonials });
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(async () => {
    const parsed = await parseBody(request, testimonialSchema);
    if ("error" in parsed) return parsed.error;

    const { clientRole, company, imageUrl, ...rest } = parsed.data;
    const testimonial = await db.testimonial.create({
      data: {
        ...rest,
        clientRole: clientRole || null,
        company: company || null,
        imageUrl: imageUrl || null,
      },
    });
    return NextResponse.json({ testimonial }, { status: 201 });
  });
}
