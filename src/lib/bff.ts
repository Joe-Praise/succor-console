import { AUTH_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";

/**
 * Server-only BFF helpers. The browser never talks to agent-service directly;
 * every call is proxied server-side through `app/api/bff/*`, which attaches the
 * JWT from the httpOnly cookie. `AGENT_SERVICE_URL` is a server-only env var —
 * agent-service therefore needs no CORS.
 */
export const AGENT_SERVICE_URL =
  process.env.AGENT_SERVICE_URL ?? "http://localhost:4000";

export { AUTH_COOKIE };

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/** Forward a request to agent-service and return its raw Response. */
export async function forwardToAgentService(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const url = `${AGENT_SERVICE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...init, cache: "no-store" });
}
