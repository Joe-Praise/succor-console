import { NextResponse } from "next/server";

import { AUTH_COOKIE } from "@/lib/bff";

/** POST /api/bff/auth/logout — clears the session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
