import { z } from "zod";

import { bff } from "./client";
import { AuditEventSchema, ProfileSchema, SupportTicketSchema, type Profile } from "@/types";

// ---------------------------------------------------------------------------
// Governance surface — audit ledger, business profile, support tickets.
// ---------------------------------------------------------------------------

export interface AuditQuery {
  action?: string;
  outcome?: string;
  targetType?: string;
  targetId?: string;
  actor?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

const AuditPageSchema = z.object({
  events: z.array(AuditEventSchema),
  nextCursor: z.string().nullable(),
});
export type AuditPage = z.infer<typeof AuditPageSchema>;

/** GET /portal/projects/:id/audit — newest first, keyset-paginated via nextCursor. */
export function listAuditEvents(projectId: string, query: AuditQuery = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const suffix = qs.size ? `?${qs}` : "";
  return bff(`/api/bff/portal/projects/${projectId}/audit${suffix}`, { schema: AuditPageSchema });
}

// ---------------------------------------------------------------------------
// Business profile (D5) — drives prompt verticalization for every agent
// ---------------------------------------------------------------------------

const ProfileResponseSchema = z.object({ profile: ProfileSchema.nullable() });

export function getProfile(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/profile`, { schema: ProfileResponseSchema });
}

/** Replaces the WHOLE profile — always send every field. */
export function updateProfile(projectId: string, profile: Profile) {
  return bff(`/api/bff/portal/projects/${projectId}/profile`, {
    method: "PATCH",
    body: profile,
    schema: ProfileResponseSchema,
  });
}

// ---------------------------------------------------------------------------
// Support tickets (tenant side; triage lives in api/admin.ts)
// ---------------------------------------------------------------------------

const TicketsSchema = z.object({ tickets: z.array(SupportTicketSchema) });

export function listTickets(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/support-tickets`, { schema: TicketsSchema });
}

export function createTicket(projectId: string, input: { subject: string; message: string }) {
  return bff(`/api/bff/portal/projects/${projectId}/support-tickets`, {
    method: "POST",
    body: input,
    schema: z.object({ ticket: SupportTicketSchema }),
  });
}
