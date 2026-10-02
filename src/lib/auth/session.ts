import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { generateSessionToken } from "@/lib/auth/password";

/**
 * Session management for the QASADAN admin area.
 * DB-backed sessions + httpOnly cookies (equivalent of Supabase Auth session model).
 */

export const SESSION_COOKIE = "qasadan_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_RENEW_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // renew when < 2 days left

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

/** Creates a DB session and sets the httpOnly cookie. Call from route handlers only. */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: { token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return token;
}

/** Returns the authenticated admin user for the current request, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  // Expiry + active-user enforcement (the "RLS" for admin access)
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;

  // Sliding renewal: extend when close to expiry
  if (session.expiresAt.getTime() - Date.now() < SESSION_RENEW_THRESHOLD_MS) {
    const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
    await db.session
      .update({ where: { id: session.id }, data: { expiresAt: newExpiry } })
      .catch(() => {});
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

/** Deletes the current session (DB row + cookie). Call from route handlers only. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Guard for admin API routes. Returns the user, or null when unauthorized
 * (caller must respond with 401). This is the write-policy equivalent of RLS.
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  return getSessionUser();
}
