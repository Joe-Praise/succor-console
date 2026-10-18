import { z } from "zod";

import { bff } from "./client";
import { ApprovalSchema, JobSchema, WorkflowSchema } from "@/types";

// ---------------------------------------------------------------------------
// Runtime surface — durable jobs (/agents/jobs), human approvals and workflows
// (/portal). Every agent POST is a durable job: 202 + jobId, then poll here.
// ---------------------------------------------------------------------------

const JobResponseSchema = z.object({ job: JobSchema });

/** GET /agents/jobs/:jobId — tenant-scoped; 404 for a job outside the caller's projects. */
export function getJob(jobId: string) {
  return bff(`/api/bff/agents/jobs/${encodeURIComponent(jobId)}`, { schema: JobResponseSchema });
}

// ---------------------------------------------------------------------------
// Approvals (Phase 5 human-in-the-loop gate)
// ---------------------------------------------------------------------------

const ApprovalsSchema = z.object({ approvals: z.array(ApprovalSchema) });

export function listApprovals(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/approvals`, { schema: ApprovalsSchema });
}

/** Reviewer edits are limited to seo-page content fields (backend .strict()). */
export interface ApprovalEdit {
  h1?: string;
  meta_title?: string;
  meta_description?: string;
  body_content?: string;
  faqs?: Array<{ question: string; answer: string }>;
  generation_note?: string;
}

export interface ApprovalDecision {
  decision: "approve" | "reject";
  note?: string;
  edit?: ApprovalEdit;
}

const DecisionResultSchema = z.object({
  status: z.string(),
  jobId: z.string(),
  delivery: z.string().optional(),
  delivered: z.boolean().optional(),
  note: z.string().optional(),
});

export function decideApproval(projectId: string, jobId: string, input: ApprovalDecision) {
  return bff(`/api/bff/portal/projects/${projectId}/approvals/${jobId}`, {
    method: "POST",
    body: input,
    schema: DecisionResultSchema,
  });
}

// ---------------------------------------------------------------------------
// Workflows (Phase 7 durable DAGs)
// ---------------------------------------------------------------------------

const WorkflowsSchema = z.object({ workflows: z.array(WorkflowSchema) });

export function listWorkflows(projectId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/workflows`, { schema: WorkflowsSchema });
}

export function getWorkflow(projectId: string, workflowId: string) {
  return bff(`/api/bff/portal/projects/${projectId}/workflows/${workflowId}`, {
    schema: WorkflowSchema,
  });
}

const StartWorkflowSchema = z.object({
  workflowId: z.string(),
  status: z.string(),
  workflowType: z.string(),
});

/** The body IS the workflow input object (no wrapper). Requires project admin. */
export function startWorkflow(
  projectId: string,
  workflowType: string,
  input: Record<string, unknown>,
) {
  return bff(`/api/bff/portal/projects/${projectId}/workflows/${workflowType}`, {
    method: "POST",
    body: input,
    schema: StartWorkflowSchema,
  });
}
