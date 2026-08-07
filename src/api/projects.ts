import { z } from "zod";

import { bff } from "./client";
import {
  ProjectSetupSchema,
  ApiKeySummarySchema,
  MintedKeySchema,
  CurrentUsageSchema,
  UsageResponseSchema,
  InvoiceSchema,
  CatalogEntrySchema,
  AgentRequestSchema,
} from "@/types";

// ---------------------------------------------------------------------------
// Project-scoped reads/mutations (agent-service /portal + /projects routers)
// ---------------------------------------------------------------------------

export function getProjectSetup(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/setup`, { schema: ProjectSetupSchema });
}

export function updateProject(
  projectId: string,
  input: { name?: string; apiBaseUrls?: Array<{ label: string; url: string }> },
) {
  return bff(`/api/bff/portal/projects/${projectId}`, { method: "PATCH", body: input });
}

const RotateResultSchema = z.object({ agentApiKey: z.string(), notice: z.string().optional() });

export function rotateCallbackKey(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/rotate-callback-key`, {
    method: "POST",
    schema: RotateResultSchema,
  });
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

const KeysSchema = z.object({ keys: z.array(ApiKeySummarySchema) });

export function listKeys(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/keys`, { schema: KeysSchema });
}

const MintResultSchema = z.object({ key: MintedKeySchema, notice: z.string().optional() });

export function mintKey(projectId: string, name: string) {
  return bff(`/api/bff/portal/projects/${projectId}/keys`, {
    method: "POST",
    body: { name },
    schema: MintResultSchema,
  });
}

export function revokeKey(projectId: string, keyId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/keys/${keyId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export function getCurrentUsage(projectId: string) {
  return bff(`/api/bff/projects/${projectId}/usage/current`, { schema: CurrentUsageSchema });
}

export interface UsageParams {
  granularity?: "day" | "month" | "year";
  groupBy?: "agent-model" | "agent" | "model" | "none";
  from?: string;
  to?: string;
}

export function getUsage(projectId: string, params: UsageParams = {}) {
  const qs = new URLSearchParams();
  if (params.granularity) qs.set("granularity", params.granularity);
  if (params.groupBy) qs.set("groupBy", params.groupBy);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const suffix = qs.size ? `?${qs}` : "";
  return bff(`/api/bff/projects/${projectId}/usage${suffix}`, { schema: UsageResponseSchema });
}

// ---------------------------------------------------------------------------
// Invoices (per project; the org rollup lives in api/orgs.ts)
// ---------------------------------------------------------------------------

const InvoiceListSchema = z.array(InvoiceSchema);

export function listInvoices(projectId: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return bff(`/api/bff/projects/${projectId}/invoices${qs}`, { schema: InvoiceListSchema });
}

export function getInvoice(projectId: string, invoiceNumber: string) {
  return bff(`/api/bff/projects/${projectId}/invoices/${invoiceNumber}`, {
    schema: InvoiceSchema,
  });
}

const SubmitPaymentResultSchema = z.object({
  invoice: InvoiceSchema,
  notice: z.string().optional(),
});

export function submitPayment(
  projectId: string,
  invoiceNumber: string,
  input: { paymentReference: string; paymentNote?: string },
) {
  return bff(`/api/bff/projects/${projectId}/invoices/${invoiceNumber}/submit-payment`, {
    method: "POST",
    body: input,
    schema: SubmitPaymentResultSchema,
  });
}

// ---------------------------------------------------------------------------
// Catalog + agent requests
// ---------------------------------------------------------------------------

const CatalogSchema = z.object({ catalog: z.array(CatalogEntrySchema) });

export function getCatalog(projectId?: string) {
  const qs = projectId ? `?projectId=${projectId}` : "";
  return bff(`/api/bff/portal/catalog${qs}`, { schema: CatalogSchema });
}

const AgentRequestsSchema = z.object({ requests: z.array(AgentRequestSchema) });

export function listAgentRequests(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/agent-requests`, {
    schema: AgentRequestsSchema,
  });
}

export interface CreateAgentRequestInput {
  title: string;
  description: string;
  desiredInputs?: string;
  desiredCallback?: string;
}

export function createAgentRequest(projectId: string, input: CreateAgentRequestInput) {
  return bff(`/api/bff/portal/projects/${projectId}/agent-requests`, {
    method: "POST",
    body: input,
  });
}

// ---------------------------------------------------------------------------
// Logs & callback deliveries (loosely typed — display-only tables)
// ---------------------------------------------------------------------------

const LogsSchema = z.array(z.record(z.string(), z.unknown()));

export function listLogs(projectId: string, limit = 50) {
  return bff(`/api/bff/projects/${projectId}/logs?limit=${limit}`, { schema: LogsSchema });
}

const DeliveriesSchema = z.object({ deliveries: z.array(z.record(z.string(), z.unknown())) });

export function listCallbacks(projectId: string, limit = 50) {
  return bff(`/api/bff/portal/projects/${projectId}/callbacks?limit=${limit}`, {
    schema: DeliveriesSchema,
  });
}

// ---------------------------------------------------------------------------
// Playground
// ---------------------------------------------------------------------------

const PlaygroundRunsSchema = z.object({ runs: z.array(z.record(z.string(), z.unknown())) });

export function listPlaygroundRuns(projectId: string, limit = 20) {
  return bff(`/api/bff/portal/projects/${projectId}/playground/runs?limit=${limit}`, {
    schema: PlaygroundRunsSchema,
  });
}

const PlaygroundRunSchema = z.object({ run: z.record(z.string(), z.unknown()) });

export function getPlaygroundRun(projectId: string, runId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/playground/runs/${runId}`, {
    schema: PlaygroundRunSchema,
  });
}

const StartRunSchema = z.object({
  runId: z.string(),
  agentType: z.string(),
  projectId: z.string(),
});

export function startPlaygroundRun(
  projectId: string,
  input: { agentType: string; body: Record<string, unknown> },
) {
  return bff(`/api/bff/portal/projects/${projectId}/playground/runs`, {
    method: "POST",
    body: input,
    schema: StartRunSchema,
  });
}
