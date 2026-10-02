import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate limit by IP before parsing (protects against brute force)
    const rl = checkRateLimit(`login:${ip}`);
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

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: "Please fill in all fields correctly.", fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const rlKey = `login:${ip}:${email.toLowerCase()}`;
    const rlEmail = checkRateLimit(rlKey);
    if (!rlEmail.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rlEmail.retryAfterSec) } }
      );
    }

    const user = await db.adminUser.findUnique({ where: { email: email.toLowerCase() } });

    // Generic error — never reveal whether the email exists
    const invalid = NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    if (!user) return invalid;
    if (!user.isActive) return invalid;
    if (!verifyPassword(password, user.passwordHash)) return invalid;

    await createSession(user.id);
    resetRateLimit(rlKey);

    await db.adminUser
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("[auth/login] error:", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
