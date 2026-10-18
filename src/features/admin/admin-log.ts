/** A row from GET /admin-api/logs (raw AgentLog, cross-tenant; loosely typed upstream). */
export interface AdminLogRow {
  _id?: string;
  ts?: string;
  projectId?: string;
  agentType?: string;
  model?: string;
  status?: string;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  embeddingTokens?: number | null;
  estimatedCostUsd?: number | null;
  billedUsd?: number | null;
  markupMultiplier?: number | null;
  pricingVersion?: string | null;
  initiatedBy?: string;
  jobId?: string | null;
  errorMessage?: string | null;
}
