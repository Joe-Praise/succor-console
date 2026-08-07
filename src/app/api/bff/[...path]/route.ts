import { NextRequest, NextResponse } from "next/server";

import { AGENT_SERVICE_URL, AUTH_COOKIE } from "@/lib/bff";

/**
 * Generic authenticated BFF proxy. Everything under /api/bff/* that isn't an
 * explicit auth route (login/register/logout take precedence) falls here: the
 * request is forwarded to agent-service with `Authorization: Bearer <jwt>`
 * read from the httpOnly cookie. No cookie → 401 without hitting the backend.
 */
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const target = `${AGENT_SERVICE_URL}/${path.join("/")}${req.nextUrl.search}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? await req.text() : undefined,
    cache: "no-store",
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
