/** Shared, dependency-free constants safe to import from middleware (edge),
 *  server route handlers, and client components alike. */

/** httpOnly session cookie holding the agent-service JWT. Never read in JS. */
export const AUTH_COOKIE = "ap_session";

/** Redirect-hint cookie: the last org the user worked in (NOT authoritative). */
export const LAST_ORG_COOKIE = "ap_last_org";

/** JWT lifetime mirrors agent-service (7 days). */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/** Routes reachable without a session. */
export const AUTH_ROUTES = ["/login", "/register"] as const;

/** App routes that require a session (cookie-presence gate in middleware). */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/invite",
  "/o",
  "/admin",
] as const;
