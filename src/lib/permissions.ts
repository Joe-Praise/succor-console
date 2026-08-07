/**
 * Mirror of agent-service `src/lib/permissions.ts` — keep the two in sync.
 * The backend enforces; this copy only drives UI gating (hide/disable).
 */

export type OrgRole = "owner" | "admin" | "developer";

export const ORG_ROLE_RANK: Record<OrgRole, number> = {
  developer: 1,
  admin: 2,
  owner: 3,
};

export const PERMISSIONS = {
  // Reads available to every member
  "org.read":                 "developer",
  "project.read":             "developer",
  "project.usage.read":       "developer",
  "project.logs.read":        "developer",
  "project.playground.run":   "developer",
  "project.support.write":    "developer",

  // Project management (no secrets for developers)
  "project.create":           "admin",
  "project.settings.write":   "admin",
  "project.keys.write":       "admin",
  "project.callbackKey.rotate": "admin",
  "project.agentRequests.write": "admin",

  // Billing (developers never see money; only the org owner moves it)
  "org.billing.read":         "admin",
  "invoice.read":             "admin",
  "invoice.submitPayment":    "owner",

  // Team
  "org.members.manage":       "admin",
  "org.owners.manage":        "owner",

  // Org settings
  "org.settings.write":       "owner",
  "org.delete":               "owner",
} as const satisfies Record<string, OrgRole>;

export type PermissionAction = keyof typeof PERMISSIONS;

/** Does `role` meet the minimum required for `action`? */
export function can(role: OrgRole, action: PermissionAction): boolean {
  return ORG_ROLE_RANK[role] >= ORG_ROLE_RANK[PERMISSIONS[action]];
}
