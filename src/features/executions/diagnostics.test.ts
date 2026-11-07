import { describe, it, expect } from "vitest";

import { diagnose, primaryDelivery } from "./diagnostics";
import { makeRecord, makeEffect, at } from "../../../test/fixtures";

describe("diagnose", () => {
  it("reports a clean, delivered run as ok", () => {
    const d = diagnose(makeRecord());
    expect(d.severity).toBe("ok");
    expect(d.title).toBe("Run succeeded and was delivered");
  });

  it("separates a successful run from a failed delivery", () => {
    const d = diagnose(
      makeRecord({ effects: [makeEffect({ status: "failed", succeededAt: null, failedAt: at(13_000), error: "HTTP 404" })] }),
    );
    expect(d.layer).toBe("delivery");
    expect(d.title).toBe("Run succeeded — your endpoint refused the delivery");
  });

  it("warns about an unknown outcome instead of suggesting a blind replay", () => {
    const d = diagnose(
      makeRecord({ effects: [makeEffect({ status: "dead", succeededAt: null, deadAt: at(20_000), outcomeUnknown: true })] }),
    );
    expect(d.severity).toBe("error");
    expect(d.nextSteps[0]).toMatch(/check your system/i);
    expect(d.nextSteps.join(" ")).not.toMatch(/retry this run/i);
  });

  it("explains a scheduled delivery retry", () => {
    const d = diagnose(
      makeRecord({ effects: [makeEffect({ status: "ready", succeededAt: null, claimedAt: null, error: "HTTP 503", nextAttemptAt: at(30_000), attempt: 1 })] }),
    );
    expect(d.severity).toBe("warning");
    expect(d.title).toBe("Run succeeded — delivery retrying");
  });

  it("names the failure class of a dead-lettered run", () => {
    expect(diagnose(makeRecord({ job: { status: "dead", runStatus: "validation_failed" }, effects: [] })).title).toBe(
      "Output failed validation",
    );
    expect(diagnose(makeRecord({ job: { status: "dead", runStatus: "rate_limited" }, effects: [] })).title).toBe(
      "The model provider rate-limited the run",
    );
    expect(diagnose(makeRecord({ job: { status: "dead", runStatus: "error" }, effects: [] })).title).toBe("The run failed");
  });

  it("treats an approved, re-queued job as delivery — not a fresh run", () => {
    const d = diagnose(makeRecord({ job: { status: "queued", attempt: 0, reviewedAt: at(9_000) }, effects: [] }));
    expect(d.title).toBe("Approved — delivering");
  });

  it("explains approval states", () => {
    expect(diagnose(makeRecord({ job: { status: "pending_approval" } })).layer).toBe("approval");
    expect(diagnose(makeRecord({ job: { status: "rejected" } })).title).toBe("Rejected by a reviewer");
  });

  it("reports no delivery when no callback was recorded", () => {
    const d = diagnose(makeRecord({ effects: [] }));
    expect(d.layer).toBe("none");
  });
});

describe("primaryDelivery", () => {
  it("picks the least-settled callback and ignores tool effects", () => {
    const rec = makeRecord({
      effects: [
        makeEffect({ id: "a", status: "succeeded" }),
        makeEffect({ id: "b", status: "dead", deadAt: at(1) }),
        makeEffect({ id: "c", kind: "mcp.tool", status: "failed" }),
      ],
    });
    expect(primaryDelivery(rec)!.id).toBe("b");
  });
});
