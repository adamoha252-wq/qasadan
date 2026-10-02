import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody } from "@/lib/admin/crud-helpers";
import { serviceSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdmin(async () => {
    const services = await db.service.findMany({
      orderBy: [{ order: "asc" }, { title: "asc" }],
    });
    return NextResponse.json({ services });
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(async () => {
    const parsed = await parseBody(request, serviceSchema);
    if ("error" in parsed) return parsed.error;

    const { imageUrl, ...rest } = parsed.data;
    const service = await db.service.create({
      data: { ...rest, imageUrl: imageUrl || null, features: JSON.stringify(parsed.data.features) },
    });
    return NextResponse.json({ service }, { status: 201 });
  });
}
