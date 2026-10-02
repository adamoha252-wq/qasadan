import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";

/** Returns the currently authenticated admin user (used to verify sessions). */
export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
