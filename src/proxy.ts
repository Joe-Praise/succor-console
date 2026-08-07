import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, AUTH_ROUTES, PROTECTED_PREFIXES } from "@/lib/constants";

/**
 * Cookie-presence auth gate (Next 16 `proxy` convention, formerly middleware).
 * The JWT is never decoded here (no secret at the edge) — presence is enough to
 * route; agent-service re-verifies on every call, and the admin layout re-checks
 * `role === "owner"` via /auth/me. Marketing pages ( /, /pricing, /agents,
 * /contact ) are public and simply not matched below.
 */
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r);
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!token && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (token && isAuthRoute) {
    const url = req.nextUrl.clone();
    // Already signed in but following an invite link → carry the token to the
    // accept page instead of dropping it on the /dashboard bounce.
    const invite = searchParams.get("invite");
    if (invite) {
      url.pathname = "/invite";
      url.search = `?token=${encodeURIComponent(invite)}`;
    } else {
      url.pathname = "/dashboard";
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/invite",
    "/o/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
