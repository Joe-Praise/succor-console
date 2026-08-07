import { z } from "zod";

import { bff } from "./client";
import {
  OrgSummarySchema,
  OrgDetailSchema,
  MemberSchema,
  InviteSchema,
  ProjectSchema,
  OrgBillingSummarySchema,
  InvoiceSchema,
  type OrgRole,
} from "@/types";

// ---------------------------------------------------------------------------
// Organizations (agent-service /orgs router via the BFF)
// ---------------------------------------------------------------------------

const OrgListSchema = z.object({ orgs: z.array(OrgSummarySchema) });

export function listOrgs() {
  return bff("/api/bff/orgs", { schema: OrgListSchema });
}

export function getOrg(orgId: string) {
  return bff(`/api/bff/orgs/${orgId}`, { schema: OrgDetailSchema });
}

export interface CreateOrgInput {
  orgId: string;
  name: string;
  billingEmail: string;
}

const CreateOrgResultSchema = z.object({
  org: z.object({
    orgId: z.string(),
    name: z.string(),
    status: z.string(),
    billingEmail: z.string(),
  }),
  notice: z.string().optional(),
});

export function createOrg(input: CreateOrgInput) {
  return bff("/api/bff/orgs", { method: "POST", body: input, schema: CreateOrgResultSchema });
}

export function updateOrg(orgId: string, input: { name?: string; billingEmail?: string }) {
  return bff(`/api/bff/orgs/${orgId}`, { method: "PATCH", body: input });
}

export function deleteOrg(orgId: string) {
  return bff(`/api/bff/orgs/${orgId}`, { method: "DELETE" });
}

export function transferOwnership(orgId: string, toUserId: string) {
  return bff(`/api/bff/orgs/${orgId}/transfer-ownership`, {
    method: "POST",
    body: { toUserId },
  });
}

// ---------------------------------------------------------------------------
// Members & invites
// ---------------------------------------------------------------------------

const MembersSchema = z.object({ members: z.array(MemberSchema) });

export function listMembers(orgId: string) {
  return bff(`/api/bff/orgs/${orgId}/members`, { schema: MembersSchema });
}

export function updateMember(orgId: string, userId: string, role: OrgRole) {
  return bff(`/api/bff/orgs/${orgId}/members/${userId}`, {
    method: "PATCH",
    body: { role },
  });
}

export function removeMember(orgId: string, userId: string) {
  return bff(`/api/bff/orgs/${orgId}/members/${userId}`, { method: "DELETE" });
}

const InvitesSchema = z.object({ invites: z.array(InviteSchema) });

export function listInvites(orgId: string) {
  return bff(`/api/bff/orgs/${orgId}/invites`, { schema: InvitesSchema });
}

const CreateInviteResultSchema = z.object({
  invite: InviteSchema.partial({ expiresAt: true }).extend({ expiresAt: z.coerce.date() }),
  emailSent: z.boolean(),
  inviteLink: z.string().optional(),
  notice: z.string().optional(),
});

export function createInvite(orgId: string, input: { email: string; role: OrgRole }) {
  return bff(`/api/bff/orgs/${orgId}/invites`, {
    method: "POST",
    body: input,
    schema: CreateInviteResultSchema,
  });
}

export function revokeInvite(orgId: string, inviteId: string) {
  return bff(`/api/bff/orgs/${orgId}/invites/${inviteId}`, { method: "DELETE" });
}

const AcceptInviteResultSchema = z.object({
  joined: z.boolean(),
  orgId: z.string(),
  name: z.string(),
  role: z.string().optional(),
});

export function acceptInvite(token: string) {
  return bff("/api/bff/portal/invites/accept", {
    method: "POST",
    body: { token },
    schema: AcceptInviteResultSchema,
  });
}

// ---------------------------------------------------------------------------
// Org projects
// ---------------------------------------------------------------------------

const OrgProjectsSchema = z.object({ projects: z.array(ProjectSchema) });

export function listOrgProjects(orgId: string) {
  return bff(`/api/bff/orgs/${orgId}/projects`, { schema: OrgProjectsSchema });
}

export interface CreateProjectInput {
  projectId: string;
  name: string;
  apiBaseUrls: Array<{ label: string; url: string }>;
}

const CreateProjectResultSchema = z.object({
  project: z.object({
    projectId: z.string(),
    name: z.string(),
    status: z.string(),
    orgId: z.string(),
  }),
  agentApiKey: z.string(), // shown ONCE
  notice: z.string().optional(),
});

export function createProject(orgId: string, input: CreateProjectInput) {
  return bff(`/api/bff/orgs/${orgId}/projects`, {
    method: "POST",
    body: input,
    schema: CreateProjectResultSchema,
  });
}

// ---------------------------------------------------------------------------
// Org billing
// ---------------------------------------------------------------------------

export function getOrgBillingSummary(orgId: string, month?: string) {
  const qs = month ? `?month=${month}` : "";
  return bff(`/api/bff/orgs/${orgId}/billing/summary${qs}`, {
    schema: OrgBillingSummarySchema,
  });
}

const OrgInvoicesSchema = z.object({ invoices: z.array(InvoiceSchema) });

export function listOrgInvoices(orgId: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return bff(`/api/bff/orgs/${orgId}/invoices${qs}`, { schema: OrgInvoicesSchema });
}
