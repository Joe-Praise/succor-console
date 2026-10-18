import { describe, it, expect } from "vitest";

import { buildTimeline, filterTimeline } from "./timeline";
import { makeRecord, makeEffect, at } from "../../../test/fixtures";

describe("buildTimeline", () => {
  it("orders events by recorded time and measures gaps between them", () => {
    const events = buildTimeline(makeRecord());
    const times = events.map((e) => e.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(events[0].title).toBe("Request accepted");
    expect(events[0].sincePreviousMs).toBeNull();
    expect(events[0].sinceStartMs).toBe(0);
    const cp = events.find((e) => e.key === "checkpoint:llm-completion")!;
    expect(cp.sinceStartMs).toBe(8_500);
    expect(cp.detail).toBe("1,400 tokens");
  });

  it("never invents a checkpoint: only recorded checkpoints appear", () => {
    const events = buildTimeline(makeRecord({ checkpoints: [] }));
    expect(events.some((e) => e.category === "step")).toBe(false);
  });

  it("skips a checkpoint without a commit time instead of guessing one", () => {
    const events = buildTimeline(
      makeRecord({ checkpoints: [{ name: "dedup", completedAt: null, usage: null }] }),
    );
    expect(events.some((e) => e.key === "checkpoint:dedup")).toBe(false);
  });

  it("labels a retried delivery's timestamps as the latest attempt", () => {
    const events = buildTimeline(
      makeRecord({ effects: [makeEffect({ attempt: 3, status: "dead", succeededAt: null, deadAt: at(20_000), error: "HTTP 503" })] }),
    );
    expect(events.some((e) => e.title === "Delivery attempt 3 started (latest attempt)")).toBe(true);
    const dead = events.find((e) => e.title === "Delivery dead-lettered")!;
    expect(dead.tone).toBe("error");
    expect(dead.detail).toBe("HTTP 503");
  });

  it("keeps job, run and delivery as separate events", () => {
    const events = buildTimeline(
      makeRecord({ effects: [makeEffect({ status: "failed", succeededAt: null, failedAt: at(13_000), error: "HTTP 404" })] }),
    );
    // The job succeeded …
    expect(events.find((e) => e.key === "job:last-update")!.tone).toBe("success");
    // … while its delivery failed.
    expect(events.find((e) => e.title === "Delivery failed — not retried")!.tone).toBe("error");
  });

  it("uses audit rows for approvals and falls back to the job's review stamp only when absent", () => {
    const withAudit = buildTimeline(
      makeRecord({
        job: { reviewedAt: at(9_000), reviewedBy: "u1" },
        audit: [{ id: "a1", ts: at(9_000), actor: "portal:u1", action: "approval.approve", outcome: "allowed", targetType: "agentJob", targetId: "job1" }],
      }),
    );
    expect(withAudit.filter((e) => e.category === "approval")).toHaveLength(1);
    expect(withAudit.find((e) => e.category === "approval")!.title).toBe("Approved by reviewer");

    const legacy = buildTimeline(makeRecord({ job: { status: "rejected", reviewedAt: at(9_000), reviewedBy: "u1" } }));
    expect(legacy.find((e) => e.key === "job:reviewed")!.title).toBe("Rejected by reviewer");
  });

  it("does not draw a terminal state for a job that is still running", () => {
    const events = buildTimeline(makeRecord({ job: { status: "running", runStatus: null }, effects: [], usage: [] }));
    expect(events.some((e) => e.key === "job:last-update")).toBe(false);
  });
});

describe("filterTimeline", () => {
  const events = buildTimeline(
    makeRecord({ effects: [makeEffect({ status: "dead", succeededAt: null, deadAt: at(20_000), error: "HTTP 503" })] }),
  );

  it("filters by category and by errors", () => {
    expect(filterTimeline(events, "steps").every((e) => e.category === "step" || e.category === "tool")).toBe(true);
    expect(filterTimeline(events, "delivery").every((e) => e.category === "delivery")).toBe(true);
    expect(filterTimeline(events, "errors").every((e) => e.tone === "error" || e.tone === "warning")).toBe(true);
    expect(filterTimeline(events, "errors").length).toBeGreaterThan(0);
  });

  it("searches title and detail", () => {
    expect(filterTimeline(events, "all", "503").length).toBeGreaterThan(0);
    expect(filterTimeline(events, "all", "zzz-nothing")).toHaveLength(0);
  });
});
