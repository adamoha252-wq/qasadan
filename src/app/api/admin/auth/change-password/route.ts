import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { requireAdmin, invalidateOtherSessions, SESSION_COOKIE } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limit";

/**
 * POST /api/admin/auth/change-password
 * Body: { currentPassword, newPassword }
 *
 * - Requires an active admin session.
 * - Verifies the current password before allowing the change.
 * - Enforces a minimum strength on the new password.
 * - Logs out all other devices (sessions) after a successful change.
 */

const MIN_LENGTH = 10;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(MIN_LENGTH, `New password must be at least ${MIN_LENGTH} characters`)
    .regex(/[A-Za-z]/, "New password must contain at least one letter")
    .regex(/[0-9]/, "New password must contain at least one number"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit per admin account (protects the current-password field from brute force)
    const rl = checkRateLimit(`pwchange:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Please check the password requirements.", fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const adminUser = await db.adminUser.findUnique({ where: { id: user.id } });
    if (!adminUser || !adminUser.isActive) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!verifyPassword(currentPassword, adminUser.passwordHash)) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "The new password must be different from the current one." },
        { status: 400 }
      );
    }

    await db.adminUser.update({
      where: { id: adminUser.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    // Log out every other device; keep this session alive.
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (currentToken) {
      await invalidateOtherSessions(adminUser.id, currentToken);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/change-password] error:", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
