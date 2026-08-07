import { z } from "zod";

import { bff } from "./client";
import { InvoiceSchema } from "@/types";

// ---------------------------------------------------------------------------
// Platform-admin API (agent-service /admin-api + /billing, owner-gated).
// Loosely typed where the payloads are display-only tables.
// ---------------------------------------------------------------------------

const OverviewSchema = z.object({
  projects: z.object({ pending: z.number(), approved: z.number(), suspended: z.number() }),
  orgs: z.object({ pending: z.number(), approved: z.number(), suspended: z.number() }),
  paymentsAwaitingConfirmation: z.number(),
  revenueThisMonth: z.object({
    runs: z.number(),
    costUsd: z.number(),
    billedUsd: z.number(),
    gainUsd: z.number(),
  }),
  today: z.object({ runs: z.number(), errors: z.number(), errorRate: z.number() }),
});
export type AdminOverview = z.infer<typeof OverviewSchema>;

export function getOverview() {
  return bff("/api/bff/admin-api/overview", { schema: OverviewSchema });
}

const AdminOrgSchema = z.object({
  orgId: z.string(),
  name: z.string(),
  status: z.string(),
  billingEmail: z.string(),
  createdBy: z.string(),
  createdAt: z.coerce.date().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  suspendedAt: z.coerce.date().nullable().optional(),
  projectCount: z.number(),
  memberCount: z.number(),
});
export type AdminOrg = z.infer<typeof AdminOrgSchema>;

export function listAdminOrgs(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return bff(`/api/bff/admin-api/orgs${qs}`, {
    schema: z.object({ orgs: z.array(AdminOrgSchema) }),
  });
}

const AdminOrgDetailSchema = z.object({
  org: z.record(z.string(), z.unknown()),
  members: z.array(
    z.object({
      userId: z.string(),
      role: z.string(),
      email: z.string().nullable(),
      name: z.string().nullable(),
    }),
  ),
  projects: z.array(z.record(z.string(), z.unknown())),
});

export function getAdminOrg(orgId: string) {
  return bff(`/api/bff/admin-api/orgs/${orgId}`, { schema: AdminOrgDetailSchema });
}

export function approveOrg(orgId: string) {
  return bff(`/api/bff/admin-api/orgs/${orgId}/approve`, { method: "POST" });
}

export function suspendOrg(orgId: string) {
  return bff(`/api/bff/admin-api/orgs/${orgId}/suspend`, { method: "POST" });
}

// Projects
export function listAdminProjects() {
  return bff("/api/bff/admin-api/projects", {
    schema: z.object({ projects: z.array(z.record(z.string(), z.unknown())) }),
  });
}

export function approveProject(projectId: string) {
  return bff(`/api/bff/admin-api/projects/${projectId}/approve`, { method: "POST" });
}

export function suspendProject(projectId: string) {
  return bff(`/api/bff/admin-api/projects/${projectId}/suspend`, { method: "POST" });
}

export function setProjectAgents(projectId: string, enabledAgents: string[] | null) {
  return bff(`/api/bff/admin-api/projects/${projectId}/agents`, {
    method: "PUT",
    body: { enabledAgents },
  });
}

export function updateAdminProject(
  projectId: string,
  input: { markupMultiplier?: number | null; monthlyBudgetUsd?: number | null },
) {
  return bff(`/api/bff/projects/${projectId}`, { method: "PUT", body: input });
}

// Payment confirmation queue
const AdminInvoiceSchema = InvoiceSchema.extend({
  projectName: z.string().optional(),
  orgId: z.string().nullable().optional(),
  orgName: z.string().nullable().optional(),
});
export type AdminInvoice = z.infer<typeof AdminInvoiceSchema>;

export function listAdminInvoices(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return bff(`/api/bff/admin-api/invoices${qs}`, {
    schema: z.object({ invoices: z.array(AdminInvoiceSchema) }),
  });
}

export function patchInvoiceStatus(
  projectId: string,
  invoiceNumber: string,
  input: { status: "issued" | "paid" | "void"; paymentReference?: string; note?: string },
) {
  return bff(`/api/bff/projects/${projectId}/invoices/${invoiceNumber}/status`, {
    method: "PATCH",
    body: input,
  });
}

export function generateInvoice(projectId: string, month: string) {
  return bff(`/api/bff/projects/${projectId}/invoices/generate`, {
    method: "POST",
    body: { month },
  });
}

export function generateAllInvoices(month: string) {
  return bff("/api/bff/billing/invoices/generate-all", { method: "POST", body: { month } });
}

// Users
const AdminUserSchema = z.object({
  _id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  active: z.boolean(),
  lastLoginAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export function listAdminUsers() {
  return bff("/api/bff/admin-api/users", {
    schema: z.object({ users: z.array(AdminUserSchema) }),
  });
}

export function patchAdminUser(
  userId: string,
  input: { active?: boolean; role?: "owner" | "tenant" },
) {
  return bff(`/api/bff/admin-api/users/${userId}`, { method: "PATCH", body: input });
}

// Agent requests
export function listAdminAgentRequests(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return bff(`/api/bff/admin-api/agent-requests${qs}`, {
    schema: z.object({ requests: z.array(z.record(z.string(), z.unknown())) }),
  });
}

export function patchAdminAgentRequest(
  id: string,
  input: { status: string; adminNotes?: string | null },
) {
  return bff(`/api/bff/admin-api/agent-requests/${id}`, { method: "PATCH", body: input });
}

// Logs
export function listAdminLogs(params: { projectId?: string; status?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.projectId) qs.set("projectId", params.projectId);
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.size ? `?${qs}` : "";
  return bff(`/api/bff/admin-api/logs${suffix}`, {
    schema: z.object({ logs: z.array(z.record(z.string(), z.unknown())) }),
  });
}

// Revenue + billing settings
export function getRevenue() {
  return bff("/api/bff/billing/revenue", {
    schema: z.record(z.string(), z.unknown()),
  });
}

export function getBillingSettings() {
  return bff("/api/bff/billing/settings", {
    schema: z.record(z.string(), z.unknown()),
  });
}

export function updateBillingSettings(defaultMarkupMultiplier: number) {
  return bff("/api/bff/billing/settings", {
    method: "PUT",
    body: { defaultMarkupMultiplier },
  });
}
