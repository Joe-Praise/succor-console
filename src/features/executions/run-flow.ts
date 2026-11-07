import type { ExecutionRecord } from "@/types";
import { primaryDelivery } from "@/features/executions/diagnostics";
import { deliveryLabel } from "@/lib/status";
import type { StationState } from "@/components/ops/station-line";

/**
 * One run as stations on the line: accepted → worked → reviewed (gated runs only) →
 * delivered. Built from the same recorded state as the timeline, and a station that hasn't
 * been reached is drawn as pending, never guessed at.
 */

export interface RunStation {
  key: "accepted" | "worked" | "reviewed" | "delivered";
  label: string;
  state: StationState;
  detail: string;
  at: Date | null;
  /** The timeline event this station opens. */
  eventKey: string | null;
}

const lastDate = (dates: Array<Date | null | undefined>): Date | null => {
  const real = dates.filter((d): d is Date => !!d);
  return real.length ? new Date(Math.max(...real.map((d) => d.getTime()))) : null;
};

export function buildRunStations(record: ExecutionRecord): RunStation[] {
  const { job, checkpoints, effects } = record;
  const stations: RunStation[] = [];

  stations.push({
    key: "accepted",
    label: "Accepted",
    state: "done",
    detail: job.workflowId ? "Started by a workflow" : job.requestId ? "202 with a job id" : "202, no requestId sent",
    at: job.createdAt,
    eventKey: "job:accepted",
  });

  const steps = checkpoints.length;
  const lastCheckpoint = checkpoints.reduce<(typeof checkpoints)[number] | null>(
    (latest, c) => (c.completedAt && (!latest?.completedAt || c.completedAt > latest.completedAt) ? c : latest),
    null,
  );
  const stepWord = `${steps} step${steps === 1 ? "" : "s"}`;
  const worked: Pick<RunStation, "state" | "detail"> =
    job.status === "queued"
      ? { state: job.attempt > 0 ? "waiting" : "pending", detail: job.attempt > 0 ? `Waiting to retry, attempt ${job.attempt} of ${job.maxAttempts}` : "Waiting for a worker" }
      : job.status === "running"
        ? { state: "active", detail: steps ? `${stepWord} saved, attempt ${job.attempt} of ${job.maxAttempts}` : `Attempt ${job.attempt} of ${job.maxAttempts}` }
        : job.status === "dead"
          ? { state: "failed", detail: `Dead-lettered after ${job.attempt} attempt${job.attempt === 1 ? "" : "s"}` }
          : { state: "done", detail: steps ? `${stepWord} saved` : "Finished" };
  stations.push({
    key: "worked",
    label: "Worked",
    ...worked,
    at: lastDate([lastCheckpoint?.completedAt]),
    eventKey: lastCheckpoint ? `checkpoint:${lastCheckpoint.name}` : null,
  });

  // Only a gated run has this station at all.
  const gated = job.status === "pending_approval" || job.status === "rejected" || !!job.reviewedAt;
  if (gated) {
    stations.push({
      key: "reviewed",
      label: "Reviewed",
      state: job.status === "pending_approval" ? "waiting" : job.status === "rejected" ? "failed" : "done",
      detail:
        job.status === "pending_approval"
          ? "Held for a human decision"
          : job.status === "rejected"
            ? "Rejected, nothing delivered"
            : "Approved",
      at: job.reviewedAt ?? null,
      eventKey: job.reviewedAt ? "job:reviewed" : null,
    });
  }

  const delivery = primaryDelivery(record);
  let delivered: Pick<RunStation, "state" | "detail" | "at">;
  if (!delivery) {
    const noneExpected = job.status === "dead" || job.status === "rejected";
    delivered = { state: noneExpected ? "skipped" : "pending", detail: noneExpected ? "Nothing to deliver" : "Not started", at: null };
  } else {
    const label = deliveryLabel(delivery);
    const attempt = delivery.attempt > 1 ? `, attempt ${delivery.attempt} of 3` : "";
    switch (delivery.status) {
      case "succeeded":
        delivered = { state: "done", detail: `${label}${attempt}`, at: delivery.succeededAt ?? null };
        break;
      case "failed":
      case "dead":
        delivered = { state: "failed", detail: `${label}${attempt}`, at: delivery.deadAt ?? delivery.failedAt ?? null };
        break;
      case "cancelled":
        delivered = { state: "skipped", detail: label, at: delivery.cancelledAt ?? null };
        break;
      case "claimed":
        delivered = { state: "active", detail: `${label}${attempt}`, at: delivery.claimedAt ?? null };
        break;
      case "ready":
        delivered = {
          state: delivery.error || delivery.attempt > 0 ? "waiting" : "active",
          detail: `${label}${attempt}`,
          at: delivery.readyAt ?? null,
        };
        break;
      default:
        delivered = { state: "pending", detail: label, at: null };
    }
  }
  const effect = delivery ? effects.find((e) => e.id === delivery.id) : null;
  stations.push({
    key: "delivered",
    label: "Delivered",
    ...delivered,
    eventKey: effect ? `effect:${effect.id}:created` : null,
  });

  return stations;
}
