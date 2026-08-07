"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

import { LAST_ORG_COOKIE } from "@/lib/constants";
import { ORG_ROLE_RANK, can, type OrgRole, type PermissionAction } from "@/lib/permissions";
import { useMe } from "@/features/auth/hooks";
import type { OrgRef } from "@/types";

interface OrgContextValue {
  org: OrgRef;
  /** The caller's role in this org. Platform admins act as "owner" in the UI. */
  role: OrgRole;
  isPlatformAdmin: boolean;
  can: (action: PermissionAction) => boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

/**
 * Org context boundary — mounted by o/[orgId]/layout.tsx. Resolves the active
 * org + the caller's role from /auth/me (the backend re-checks on every call;
 * this only drives UI gating) and records the org as the /dashboard redirect
 * hint. Renders nothing while /me loads; unknown orgs render a fallback.
 */
export function OrgProvider({
  orgId,
  children,
  fallback,
}: {
  orgId: string;
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const { data, isLoading } = useMe();

  const org = data?.orgs.find((o) => o.orgId === orgId) ?? null;
  const isPlatformAdmin = data?.isPlatformAdmin ?? false;
  // Platform admins aren't members but can drive every surface (backend
  // resolves them as "platform"); model them as "owner" for UI gating.
  const role: OrgRole | null = org?.role ?? (isPlatformAdmin ? "owner" : null);

  useEffect(() => {
    if (org) {
      document.cookie = `${LAST_ORG_COOKIE}=${encodeURIComponent(orgId)};path=/;max-age=${60 * 60 * 24 * 90};samesite=lax`;
    }
  }, [org, orgId]);

  const value = useMemo<OrgContextValue | null>(() => {
    if (!role) return null;
    const orgRef: OrgRef =
      org ??
      ({ orgId, name: orgId, status: "approved", role: "owner", projects: [] } as OrgRef);
    return {
      org: orgRef,
      role,
      isPlatformAdmin,
      can: (action) => can(role, action),
    };
  }, [org, orgId, role, isPlatformAdmin]);

  if (isLoading) return null;
  if (!value) return <>{fallback}</>;
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

/** The active org + role. Throws outside an /o/[orgId] subtree. */
export function useOrgCtx(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgCtx must be used inside OrgProvider (/o/[orgId]/…)");
  return ctx;
}

/**
 * Render children only when the caller's org role meets `min`.
 * Developers never see billing/secret affordances (§ permission matrix) —
 * prefer hiding over disabling for entire sections.
 */
export function RoleGate({
  min,
  children,
  fallback = null,
}: {
  min: OrgRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { role } = useOrgCtx();
  if (ORG_ROLE_RANK[role] < ORG_ROLE_RANK[min]) return <>{fallback}</>;
  return <>{children}</>;
}
