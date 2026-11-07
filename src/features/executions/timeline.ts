import type { ExecutionRecord, Effect } from "@/types";
import { toneOf, deliveryTone, type Tone } from "@/lib/status";
import { usdPrecise, tokens as fmtTokens } from "@/lib/format";

/**
 * Build a run's timeline from RECORDED timestamps only.
 *
 * What is recorded (agent-service): job createdAt/updatedAt/reviewedAt, each
 * checkpoint's completedAt, each effect's createdAt/readyAt/claimedAt/succeededAt/
 * failedAt/cancelledAt/deadAt, each AgentLog row's ts, each audit row's ts.
 *
 * What is NOT recorded, and therefore never drawn: when a step STARTED, when each
 * attempt was claimed, when a retry was scheduled. So the gap between two events is
 * "time since the previous recorded event" — never a step's duration — and an
 * effect's readyAt/claimedAt are its LATEST values (they are overwritten per retry).
 */

export type TimelineCategory = "lifecycle" | "step" | "delivery" | "tool" | "approval" | "billing";

export type TimelineRef =
  | { type: "checkpoint"; name: string }
  | { type: "effect"; id: string }
  | { type: "usage"; id: string }
  | { type: "audit"; id: string };

export interface TimelineEvent {
  key: string;
  at: Date;
  category: TimelineCategory;
  title: string;
  detail: string | null;
  tone: Tone;
  ref: TimelineRef | null;
  /** ms since the previous recorded event (null for the first). */
  sincePreviousMs: number | null;
  /** ms since the job was created. */
  sinceStartMs: number;
}

type Draft = Omit<TimelineEvent, "sincePreviousMs" | "sinceStartMs"> & { order: number };

const APPROVAL_ACTIONS = new Set(["approval.approve", "approval.reject"]);

function effectEvents(e: Effect, order: number): Draft[] {
  const isTool = e.kind === "mcp.tool";
  const category: TimelineCategory = isTool ? "tool" : "delivery";
  const what = isTool
    ? `Tool call ${String(e.target?.["toolName"] ?? e.effectKey)}`
    : `Callback ${String(e.target?.["method"] ?? "")} ${String(e.target?.["path"] ?? e.effectKey)}`.replace(/\s+/g, " ").trim();
  const latest = e.attempt > 1 ? " (latest attempt)" : "";
  const ref: TimelineRef = { type: "effect", id: e.id };
  const out: Draft[] = [
    {
      key: `effect:${e.id}:created`,
      at: e.createdAt,
      category,
      title: isTool ? "Tool call recorded" : "Delivery intent recorded",
      detail: what,
      tone: "neutral",
      ref,
      order,
    },
  ];
  if (e.readyAt) {
    out.push({
      key: `effect:${e.id}:ready`,
      at: e.readyAt,
      category,
      title: isTool ? "Tool call released" : `Released for delivery${latest}`,
      detail: what,
      tone: "info",
      ref,
      order: order + 0.1,
    });
  }
  if (e.claimedAt) {
    out.push({
      key: `effect:${e.id}:claimed`,
      at: e.claimedAt,
      category,
      title: isTool ? `Tool call started${latest}` : `Delivery attempt ${e.attempt} started${latest}`,
      detail: what,
      tone: "info",
      ref,
      order: order + 0.2,
    });
  }
  const terminal: Array<[Date | null | undefined, string, Tone]> = [
    [e.succeededAt, isTool ? "Tool call succeeded" : "Delivered", "success"],
    [e.failedAt, isTool ? "Tool call failed" : "Delivery failed — not retried", "error"],
    [e.deadAt, isTool ? "Tool call dead-lettered" : "Delivery dead-lettered", "error"],
    [e.cancelledAt, isTool ? "Tool call cancelled" : "Delivery cancelled — not sent", "faint"],
  ];
  for (const [at, title, tone] of terminal) {
    if (!at) continue;
    out.push({
      key: `effect:${e.id}:${title}`,
      at,
      category,
      title,
      detail: e.error ?? what,
      tone: tone === "faint" ? "faint" : tone,
      ref,
      order: order + 0.3,
    });
  }
  if (!e.succeededAt && !e.failedAt && !e.deadAt && !e.cancelledAt && e.status === "ready" && e.error && e.nextAttemptAt) {
    out.push({
      key: `effect:${e.id}:retry`,
      at: e.readyAt ?? e.createdAt,
      category,
      title: "Retry scheduled",
      detail: e.error,
      tone: deliveryTone(e),
      ref,
      order: order + 0.15,
    });
  }
  return out;
}

export function buildTimeline(rec: ExecutionRecord): TimelineEvent[] {
  const { job } = rec;
  const drafts: Draft[] = [];
  let order = 0;

  drafts.push({
    key: "job:accepted",
    at: job.createdAt,
    category: "lifecycle",
    title: "Request accepted",
    detail: `Durable job created by ${job.initiatedBy}`,
    tone: "neutral",
    ref: null,
    order: order++,
  });

  for (const cp of rec.checkpoints) {
    if (!cp.completedAt) continue;
    const used =
      cp.usage && (cp.usage.inputTokens !== null || cp.usage.outputTokens !== null)
        ? `${fmtTokens((cp.usage.inputTokens ?? 0) + (cp.usage.outputTokens ?? 0))} tokens`
        : null;
    drafts.push({
      key: `checkpoint:${cp.name}`,
      at: cp.completedAt,
      category: "step",
      title: `Checkpoint committed · ${cp.name}`,
      detail: used,
      tone: cp.undecodable ? "warning" : "success",
      ref: { type: "checkpoint", name: cp.name },
      order: order++,
    });
  }

  for (const u of rec.usage) {
    drafts.push({
      key: `usage:${u.id}`,
      at: u.ts,
      category: "billing",
      title: u.status === "success" ? "Run metered" : `Run metered · ${u.status.replace(/_/g, " ")}`,
      detail: `${usdPrecise(u.billedUsd)} billed · ${u.model}`,
      tone: toneOf(u.status),
      ref: { type: "usage", id: u.id },
      order: order++,
    });
  }

  for (const e of rec.effects) {
    drafts.push(...effectEvents(e, order));
    order += 1;
  }

  const approvalAudits = rec.audit.filter((a) => a.action && APPROVAL_ACTIONS.has(a.action));
  for (const a of rec.audit) {
    if (!a.ts || a.unreadable) continue;
    const isApproval = a.action ? APPROVAL_ACTIONS.has(a.action) : false;
    drafts.push({
      key: `audit:${a.id}`,
      at: a.ts,
      category: isApproval ? "approval" : "lifecycle",
      title:
        a.action === "approval.approve"
          ? a.outcome === "allowed" ? "Approved by reviewer" : `Approval attempt · ${a.outcome}`
          : a.action === "approval.reject"
            ? a.outcome === "allowed" ? "Rejected by reviewer" : `Rejection attempt · ${a.outcome}`
            : `Audit · ${a.action ?? "event"}`,
      detail: a.actor ?? null,
      tone: a.outcome === "allowed" ? (a.action === "approval.reject" ? "error" : "success") : "warning",
      ref: { type: "audit", id: a.id },
      order: order++,
    });
  }
  // Older approvals predate the audit ledger — fall back to the job's own review stamp.
  if (job.reviewedAt && approvalAudits.length === 0) {
    drafts.push({
      key: "job:reviewed",
      at: job.reviewedAt,
      category: "approval",
      title: job.status === "rejected" ? "Rejected by reviewer" : "Reviewed",
      detail: job.reviewedBy ? `by ${job.reviewedBy}` : null,
      tone: job.status === "rejected" ? "error" : "success",
      ref: null,
      order: order++,
    });
  }

  // The job's last recorded state write. It is a real timestamp, labelled as what it
  // is — not as "finished", because later writes (e.g. retention) can also move it.
  if (job.status !== "queued" && job.status !== "running") {
    drafts.push({
      key: "job:last-update",
      at: job.updatedAt,
      category: "lifecycle",
      title: `Job state recorded · ${job.status.replace(/_/g, " ")}`,
      detail: job.lastError ?? null,
      tone: toneOf(job.status),
      ref: null,
      order: order++,
    });
  }

  const sorted = drafts
    .map((d) => ({ ...d, at: new Date(d.at) }))
    .filter((d) => Number.isFinite(d.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.order - b.order);

  const start = new Date(job.createdAt).getTime();
  return sorted.map((d, i) => {
    const { order: _order, ...rest } = d;
    void _order;
    const prev = i > 0 ? sorted[i - 1].at.getTime() : null;
    return {
      ...rest,
      sincePreviousMs: prev === null ? null : Math.max(0, d.at.getTime() - prev),
      sinceStartMs: Math.max(0, d.at.getTime() - start),
    };
  });
}

/** Events for one filter tab of the run detail event list. */
export function filterTimeline(
  events: TimelineEvent[],
  filter: "all" | "steps" | "delivery" | "approval" | "errors",
  search = "",
): TimelineEvent[] {
  const q = search.trim().toLowerCase();
  return events.filter((e) => {
    if (filter === "steps" && e.category !== "step" && e.category !== "tool") return false;
    if (filter === "delivery" && e.category !== "delivery") return false;
    if (filter === "approval" && e.category !== "approval") return false;
    if (filter === "errors" && e.tone !== "error" && e.tone !== "warning") return false;
    if (!q) return true;
    return `${e.title} ${e.detail ?? ""}`.toLowerCase().includes(q);
  });
}
