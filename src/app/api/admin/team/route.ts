import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody } from "@/lib/admin/crud-helpers";
import { teamMemberSchema } from "@/lib/admin/schemas";

export async function GET() {
  return withAdmin(async () => {
    const members = await db.teamMember.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ members });
  });
}

export async function POST(request: NextRequest) {
  return withAdmin(async () => {
    const parsed = await parseBody(request, teamMemberSchema);
    if ("error" in parsed) return parsed.error;

    const { bio, imageUrl, linkedinUrl, twitterUrl, ...rest } = parsed.data;
    const member = await db.teamMember.create({
      data: {
        ...rest,
        bio: bio || null,
        imageUrl: imageUrl || null,
        linkedinUrl: linkedinUrl || null,
        twitterUrl: twitterUrl || null,
      },
    });
    return NextResponse.json({ member }, { status: 201 });
  });
}
