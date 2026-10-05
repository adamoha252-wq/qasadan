import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePublicSite } from "@/lib/revalidate";

/**
 * Shared helpers for admin API routes — the write-policy layer
 * (every mutation passes through withAdmin()).
 *
 * Pass { revalidate: true } on mutations that change public content so the
 * cached public pages refresh immediately.
 */
export async function withAdmin(
  handler: () => Promise<NextResponse>,
  opts?: { revalidate?: boolean; roles?: string[] }
): Promise<NextResponse> {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Optional role gate (e.g. payment settings are founder/ADMIN-only).
  if (opts?.roles && opts.roles.length > 0 && !opts.roles.includes(user.role)) {
    return NextResponse.json(
      { error: "You do not have permission to perform this action." },
      { status: 403 }
    );
  }
  try {
    const response = await handler();
    if (opts?.revalidate && response.status >= 200 && response.status < 300) {
      revalidatePublicSite();
    }
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    // Prisma unique constraint violation → friendly message
    if (typeof message === "string" && message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A record with this slug or name already exists." },
        { status: 409 }
      );
    }
    console.error("[admin-api]", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * Same as withAdmin(), but purges the cached public pages after a successful
 * mutation — use for every handler that changes public-facing content.
 */
export function withAdminR(handler: () => Promise<NextResponse>) {
  return withAdmin(handler, { revalidate: true });
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid request body" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: NextResponse.json(
        { error: first?.message || "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      ),
    };
  }
  return { data: parsed.data };
}

export function notFound(what = "Record") {
  return NextResponse.json({ error: `${what} not found` }, { status: 404 });
}
