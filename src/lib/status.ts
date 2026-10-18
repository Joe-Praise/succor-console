/**
 * The status vocabulary, as DATA. Three independent lifecycles describe one run and
 * must never be collapsed into one another:
 *
 *   job      — the durable job (queued → running → succeeded | dead | pending_approval | rejected)
 *   run      — what the agent itself returned (success | error | validation_failed | rate_limited | skipped)
 *   delivery — the callback effect (pending → ready → claimed → succeeded | failed | cancelled | dead)
 *
 * A job can be `succeeded` while its delivery is `failed`. Every page that shows a run
 * reads these sets instead of re-declaring them.
 */

export const JOB_STATUSES = ["queued", "running", "succeeded", "dead", "pending_approval", "rejected"] as const;
export type JobStatusValue = (typeof JOB_STATUSES)[number];

/** The worker is actively moving these — poll them. */
export const LIVE_JOB_STATUSES: ReadonlySet<string> = new Set(["queued", "running"]);
/** Waiting on a human, not on the worker. */
export const PARKED_JOB_STATUSES: ReadonlySet<string> = new Set(["pending_approval"]);
export const TERMINAL_JOB_STATUSES: ReadonlySet<string> = new Set(["succeeded", "dead", "rejected"]);

export const RUN_STATUSES = ["success", "error", "rate_limited", "validation_failed", "skipped"] as const;
/** Run outcomes that count as failures in rates and filters. */
export const FAILED_RUN_STATUSES: ReadonlySet<string> = new Set(["error", "rate_limited", "validation_failed"]);

export const DELIVERY_STATUSES = ["pending", "ready", "claimed", "succeeded", "failed", "cancelled", "dead"] as const;
/** `failed` is TERMINAL (a permanent, classified failure such as a receiver 4xx); a
 *  retry is `ready` with an error and a future `nextAttemptAt` — see deliveryLabel(). */
export const TERMINAL_DELIVERY_STATUSES: ReadonlySet<string> = new Set(["succeeded", "failed", "cancelled", "dead"]);

export type Tone = "neutral" | "info" | "success" | "warning" | "error" | "faint" | "brand";

/** Tone per status for charts, dots and segments (badges use status-badge.tsx). */
const TONE: Record<string, Tone> = {
  queued: "neutral",
  running: "info",
  critiquing: "info",
  claimed: "info",
  ready: "info",
  pending: "neutral",
  pending_approval: "warning",
  paused: "warning",
  succeeded: "success",
  success: "success",
  delivered: "success",
  dead: "error",
  failed: "error",
  error: "error",
  validation_failed: "error",
  rate_limited: "warning",
  rejected: "error",
  cancelled: "faint",
  skipped: "faint",
};

export function toneOf(status: string | null | undefined): Tone {
  return (status && TONE[status]) || "neutral";
}

/** Tailwind background class for a dot/segment of the given tone. */
export const TONE_BG: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  faint: "bg-faint",
  brand: "bg-brand",
};

export function dotClass(status: string | null | undefined): string {
  return TONE_BG[toneOf(status)];
}

/** Human labels for the delivery lifecycle (effect statuses read oddly raw). */
export const DELIVERY_LABEL: Record<string, string> = {
  pending: "Waiting for run",
  ready: "Queued to deliver",
  claimed: "Delivering",
  succeeded: "Delivered",
  failed: "Failed (not retried)",
  cancelled: "Not sent",
  dead: "Dead-lettered",
};

/**
 * Label for one delivery effect. A `ready` row that already carries an error is a
 * scheduled RETRY, not a first attempt — the backend models retry as claimed → ready
 * with a future nextAttemptAt.
 */
export function deliveryLabel(d: { status: string; error?: string | null; attempt?: number }): string {
  if (d.status === "ready" && (d.error || (d.attempt ?? 0) > 0)) return "Retry scheduled";
  return DELIVERY_LABEL[d.status] ?? d.status;
}

/** Tone for one delivery effect (a scheduled retry reads as warning, not info). */
export function deliveryTone(d: { status: string; error?: string | null; attempt?: number }): Tone {
  if (d.status === "ready" && (d.error || (d.attempt ?? 0) > 0)) return "warning";
  return toneOf(d.status);
}
