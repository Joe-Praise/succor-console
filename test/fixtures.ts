import type { ExecutionRecord, Effect, UsageRecord } from "@/types";

/**
 * Test-only fixtures for the execution record. Never imported by app code — the
 * console renders only what the API returns.
 */

const T0 = new Date("2026-10-18T12:00:00.000Z");
export const at = (ms: number) => new Date(T0.getTime() + ms);

export function makeEffect(overrides: Partial<Effect> = {}): Effect {
  return {
    id: "eff1",
    effectKey: "callback:main",
    kind: "http.callback",
    status: "succeeded",
    attempt: 1,
    outcomeUnknown: false,
    error: null,
    deliveryId: "job1:callback:main",
    nextAttemptAt: null,
    createdAt: at(8_000),
    readyAt: at(12_000),
    claimedAt: at(12_100),
    succeededAt: at(12_400),
    failedAt: null,
    cancelledAt: null,
    deadAt: null,
    target: { method: "PUT", path: "/api/v1/admin/courses/c-1/quiz" },
    ...overrides,
  };
}

export function makeUsage(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    id: "log1",
    ts: at(11_900),
    jobId: "job1",
    agentType: "quiz-generator",
    model: "gpt-4o",
    status: "success",
    inputTokens: 1000,
    outputTokens: 400,
    embeddingTokens: null,
    toolCalls: null,
    estimatedCostUsd: 0.0065,
    billedUsd: 0.013,
    markupMultiplier: 2,
    pricingVersion: "2026-04",
    durationMs: 11_800,
    initiatedBy: "apikey:k1",
    errorMessage: null,
    ...overrides,
  };
}

export function makeRecord(overrides: {
  job?: Partial<ExecutionRecord["job"]>;
  checkpoints?: ExecutionRecord["checkpoints"];
  effects?: Effect[];
  usage?: UsageRecord[];
  audit?: ExecutionRecord["audit"];
} = {}): ExecutionRecord {
  return {
    job: {
      id: "job1",
      agentType: "quiz-generator",
      status: "succeeded",
      runStatus: "success",
      attempt: 1,
      maxAttempts: 1,
      requestId: "req-1",
      workflowId: null,
      initiatedBy: "apikey:k1",
      lastError: null,
      createdAt: at(0),
      updatedAt: at(12_000),
      nextRunAt: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      result: { questions: [] },
      input: { courseId: "c-1" },
      ...overrides.job,
    },
    checkpoints: overrides.checkpoints ?? [
      { name: "llm-completion", completedAt: at(8_500), usage: { inputTokens: 1000, outputTokens: 400 } },
    ],
    effects: overrides.effects ?? [makeEffect()],
    usage: overrides.usage ?? [makeUsage()],
    audit: overrides.audit ?? [],
  };
}
