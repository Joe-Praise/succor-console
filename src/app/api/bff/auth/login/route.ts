import { NextRequest, NextResponse } from "next/server";

import {
  AGENT_SERVICE_URL,
  AUTH_COOKIE,
  sessionCookieOptions,
} from "@/lib/bff";

/**
 * POST /api/bff/auth/login — proxies to agent-service /auth/login. On success
 * the returned JWT is stored in an httpOnly cookie (never exposed to JS) and
 * only the user object is returned to the browser.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${AGENT_SERVICE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const res = NextResponse.json({ user: data.user });
  res.cookies.set(AUTH_COOKIE, data.token, sessionCookieOptions);
  return res;
}
