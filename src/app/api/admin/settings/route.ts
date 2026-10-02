import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAdmin, parseBody } from "@/lib/admin/crud-helpers";
import { settingsSchema } from "@/lib/admin/schemas";

const SETTING_KEYS = [
  "contact.email",
  "contact.phone",
  "contact.address",
  "social.facebook",
  "social.twitter",
  "social.linkedin",
  "social.instagram",
  "site.tagline",
];

export async function GET() {
  return withAdmin(async () => {
    const rows = await db.siteSetting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({ settings });
  });
}

export async function PUT(request: NextRequest) {
  return withAdmin(async () => {
    const parsed = await parseBody(request, settingsSchema);
    if ("error" in parsed) return parsed.error;

    const { values } = parsed.data;
    const updates = Object.entries(values).filter(([key]) =>
      (SETTING_KEYS as string[]).includes(key)
    );

    for (const [key, value] of updates) {
      await db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    const rows = await db.siteSetting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({ settings });
  });
}
