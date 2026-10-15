import { NextRequest, NextResponse } from "next/server";

import { forwardToAgentService } from "@/lib/bff";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/bff/auth/forgot-password — public proxy to agent-service
 * /auth/forgot-password. Explicit route because the generic proxy requires a
 * session cookie. agent-service answers identically whether or not the account
 * exists, so this just relays it.
 */
export async function POST(req: NextRequest) {
  const upstream = await forwardToAgentService("/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status, headers: NO_STORE });
}
