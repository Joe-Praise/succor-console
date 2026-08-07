import { LAST_ORG_COOKIE } from "@/lib/constants";
import type { Me } from "@/types";

/** The last org the user worked in (readable redirect hint, set by OrgProvider). */
export function lastOrgFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LAST_ORG_COOKIE}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

/**
 * Where a user belongs after auth. Platform admins → /admin; members → their
 * last-used org (cookie hint) else their first org; no orgs yet → onboarding.
 * Used at login time (so members go STRAIGHT to /o/… without a /dashboard hop)
 * and by the /dashboard fallback resolver.
 */
export function resolveLanding(me: Me): string {
  if (me.isPlatformAdmin) return "/admin";
  if (me.orgs.length === 0) return "/onboarding";
  const last = lastOrgFromCookie();
  const target = me.orgs.find((o) => o.orgId === last) ?? me.orgs[0];
  return `/o/${target.orgId}`;
}
