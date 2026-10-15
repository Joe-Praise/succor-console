import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_COOKIE,
  forwardToAgentService,
  sessionCookieOptions,
} from "@/lib/bff";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/bff/auth/change-password — proxies to agent-service
 * /auth/change-password. Explicit route (not the generic proxy) because the
 * upstream success body carries a FRESH JWT: it must go into the httpOnly
 * cookie, never to the browser. The change revokes every older token —
 * including the one in the cookie now — so without this swap the user would be
 * signed out by their own password change.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: NO_STORE });
  }

  const upstream = await forwardToAgentService("/auth/change-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: await req.text(),
  });

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status, headers: NO_STORE });
  }

  if (typeof data.token !== "string" || !data.token) {
    // Password changed upstream but no replacement token — the old cookie is
    // now revoked, so clear it and make the user sign in with the new password.
    const res = NextResponse.json(
      { error: "Password changed. Please sign in again." },
      { status: 502, headers: NO_STORE },
    );
    res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const res = NextResponse.json({ user: data.user }, { headers: NO_STORE });
  res.cookies.set(AUTH_COOKIE, data.token, sessionCookieOptions);
  return res;
}
