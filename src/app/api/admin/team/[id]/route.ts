import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, withAdminR, parseBody, notFound } from "@/lib/admin/crud-helpers";
import { teamMemberSchema } from "@/lib/admin/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return withAdmin(async () => {
    const { id } = await params;
    const member = await db.teamMember.findUnique({ where: { id } });
    if (!member) return notFound("Team member");
    return NextResponse.json({ member });
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const parsed = await parseBody(request, teamMemberSchema);
    if ("error" in parsed) return parsed.error;

    const existing = await db.teamMember.findUnique({ where: { id } });
    if (!existing) return notFound("Team member");

    const { bio, imageUrl, linkedinUrl, twitterUrl, ...rest } = parsed.data;
    const member = await db.teamMember.update({
      where: { id },
      data: {
        ...rest,
        bio: bio || null,
        imageUrl: imageUrl || null,
        linkedinUrl: linkedinUrl || null,
        twitterUrl: twitterUrl || null,
      },
    });
    return NextResponse.json({ member });
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAdminR(async () => {
    const { id } = await params;
    const existing = await db.teamMember.findUnique({ where: { id } });
    if (!existing) return notFound("Team member");
    await db.teamMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
