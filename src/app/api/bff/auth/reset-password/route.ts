import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, forwardToAgentService } from "@/lib/bff";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/bff/auth/reset-password — public proxy to agent-service
 * /auth/reset-password. On success every existing session is revoked
 * server-side, so any session cookie in this browser is now dead: clear it,
 * otherwise the route proxy would treat the browser as signed in and bounce
 * /login to a dashboard that can only 401.
 */
export async function POST(req: NextRequest) {
  const upstream = await forwardToAgentService("/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  });
  const data = await upstream.json().catch(() => ({}));
  const res = NextResponse.json(data, { status: upstream.status, headers: NO_STORE });
  if (upstream.ok) res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
