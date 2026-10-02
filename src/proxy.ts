import { NextRequest, NextResponse } from "next/server";

/**
 * QASADAN proxy (Next.js 16 successor of middleware) — first line of defense
 * for /admin routes. Fast cookie-presence check (edge runtime cannot query the
 * database). Full session validation (expiry, active user) happens in the
 * guarded admin layout and in every admin API route via requireAdmin().
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard non-login admin pages
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdminPage) {
    const token = request.cookies.get("qasadan_session")?.value;
    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
