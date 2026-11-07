import { describe, expect, it } from "vitest";

import { at, makeEffect } from "../../../test/fixtures";
import type { ExecutionRecord } from "@/types";
import { buildRunStations, type RunStation } from "./run-flow";

function record(job: Partial<ExecutionRecord["job"]>, rest: Partial<ExecutionRecord> = {}): ExecutionRecord {
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
      initiatedBy: "apikey:1",
      lastError: null,
      createdAt: at(0),
      updatedAt: at(20_000),
      nextRunAt: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      ...job,
    },
    checkpoints: [{ name: "generate", completedAt: at(9_000), usage: null }],
    effects: [makeEffect()],
    usage: [],
    audit: [],
    ...rest,
  };
}

const station = (stations: RunStation[], key: RunStation["key"]) => stations.find((s) => s.key === key);

describe("buildRunStations", () => {
  it("shows a clean run as accepted, worked, delivered, with no review station", () => {
    const s = buildRunStations(record({}));
    expect(s.map((x) => x.key)).toEqual(["accepted", "worked", "delivered"]);
    expect(s.every((x) => x.state === "done")).toBe(true);
  });

  it("marks a queued job as waiting for a worker, not as working", () => {
    const s = buildRunStations(record({ status: "queued", attempt: 0, runStatus: null }, { checkpoints: [], effects: [] }));
    expect(station(s, "worked")?.state).toBe("pending");
    expect(station(s, "delivered")?.state).toBe("pending");
  });

  it("shows a queued job that already ran as a retry", () => {
    const s = buildRunStations(record({ status: "queued", attempt: 1, maxAttempts: 3, runStatus: null }, { effects: [] }));
    expect(station(s, "worked")?.state).toBe("waiting");
    expect(station(s, "worked")?.detail).toContain("retry");
  });

  it("adds a review station only for gated runs, and holds there", () => {
    const s = buildRunStations(record({ status: "pending_approval" }, { effects: [makeEffect({ status: "pending", readyAt: null, claimedAt: null, succeededAt: null })] }));
    expect(station(s, "reviewed")?.state).toBe("waiting");
    expect(station(s, "delivered")?.state).toBe("pending");
  });

  it("shows a rejection as a failed review with nothing delivered", () => {
    const s = buildRunStations(record({ status: "rejected", reviewedAt: at(30_000) }, { effects: [] }));
    expect(station(s, "reviewed")?.state).toBe("failed");
    expect(station(s, "delivered")?.state).toBe("skipped");
  });

  it("keeps execution and delivery separate: a succeeded job can fail delivery", () => {
    const s = buildRunStations(record({}, { effects: [makeEffect({ status: "dead", attempt: 3, succeededAt: null, deadAt: at(60_000) })] }));
    expect(station(s, "worked")?.state).toBe("done");
    expect(station(s, "delivered")?.state).toBe("failed");
    expect(station(s, "delivered")?.detail).toContain("attempt 3 of 3");
  });

  it("calls a ready delivery with an error a scheduled retry, not a first attempt", () => {
    const s = buildRunStations(record({}, { effects: [makeEffect({ status: "ready", attempt: 2, error: "503", succeededAt: null })] }));
    expect(station(s, "delivered")?.state).toBe("waiting");
    expect(station(s, "delivered")?.detail).toContain("Retry");
  });

  it("marks a dead job's run as failed and its delivery as not applicable", () => {
    const s = buildRunStations(record({ status: "dead", attempt: 3, maxAttempts: 3 }, { effects: [] }));
    expect(station(s, "worked")?.state).toBe("failed");
    expect(station(s, "delivered")?.state).toBe("skipped");
  });

  it("says when a workflow started the job rather than a request", () => {
    expect(station(buildRunStations(record({ workflowId: "wf1" })), "accepted")?.detail).toContain("workflow");
  });
});
