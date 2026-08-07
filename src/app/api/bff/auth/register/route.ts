import { NextRequest, NextResponse } from "next/server";

import {
  AGENT_SERVICE_URL,
  AUTH_COOKIE,
  sessionCookieOptions,
} from "@/lib/bff";

/**
 * POST /api/bff/auth/register — proxies to agent-service /auth/register, which
 * returns a JWT + user (agent-service auto-logs-in on register). We store the
 * JWT in the httpOnly cookie and return the user.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${AGENT_SERVICE_URL}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const res = NextResponse.json({ user: data.user }, { status: 201 });
  res.cookies.set(AUTH_COOKIE, data.token, sessionCookieOptions);
  return res;
}
