import { z } from "zod";

import { bff } from "./client";
import {
  RunPageSchema,
  ExecutionRecordSchema,
  CheckpointOutputSchema,
  UsageRecordPageSchema,
  UsageRecordSchema,
  CallbackDeliverySchema,
  AuditEventSchema,
  OpsSummarySchema,
} from "@/types";

// ---------------------------------------------------------------------------
// Execution control plane — agent-service routes/executions.ts (read-only).
// Every call is project-scoped by the path; a record outside the project is a 404.
// ---------------------------------------------------------------------------

function qs(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  return q.size ? `?${q}` : "";
}

export interface RunListQuery {
  status?: string; // csv of job statuses
  agentType?: string;
  workflowId?: string;
  requestId?: string;
  initiatedBy?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | null;
}

export function listRuns(projectId: string, query: RunListQuery = {}) {
  return bff(`/api/bff/portal/projects/${projectId}/jobs${qs({ ...query })}`, { schema: RunPageSchema });
}

export function getExecution(projectId: string, jobId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/jobs/${encodeURIComponent(jobId)}`, {
    schema: ExecutionRecordSchema,
  });
}

export function getCheckpointOutput(projectId: string, jobId: string, name: string) {
  return bff(
    `/api/bff/portal/projects/${projectId}/jobs/${encodeURIComponent(jobId)}/checkpoints/${encodeURIComponent(name)}`,
    { schema: CheckpointOutputSchema },
  );
}

export interface UsageRecordQuery {
  agentType?: string;
  model?: string;
  status?: string; // csv of run statuses
  jobId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | null;
}

export function listUsageRecords(projectId: string, query: UsageRecordQuery = {}) {
  return bff(`/api/bff/portal/projects/${projectId}/usage-records${qs({ ...query })}`, {
    schema: UsageRecordPageSchema,
  });
}

export function getUsageRecord(projectId: string, recordId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/usage-records/${encodeURIComponent(recordId)}`, {
    schema: z.object({ record: UsageRecordSchema }),
  });
}

export function getCallbackDelivery(projectId: string, callbackId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/callbacks/${encodeURIComponent(callbackId)}`, {
    schema: z.object({ delivery: CallbackDeliverySchema }),
  });
}

export function getAuditEvent(projectId: string, eventId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/audit/${encodeURIComponent(eventId)}`, {
    schema: z.object({ event: AuditEventSchema }),
  });
}

export function getOpsSummary(projectId: string, range: { from?: string; to?: string } = {}) {
  return bff(`/api/bff/portal/projects/${projectId}/ops-summary${qs(range)}`, { schema: OpsSummarySchema });
}
