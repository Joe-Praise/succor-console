import { describe, it, expect } from "vitest";

import { fillDaily, successRate, undeliverable, jobSlices } from "./ops";

describe("ops overview transforms", () => {
  it("zero-fills every UTC day in the window without interpolating durations", () => {
    const days = fillDaily(
      [{ date: "2026-10-16", succeeded: 3, failed: 1, other: 0, avgDurationMs: 900 }],
      "2026-10-15T12:00:00.000Z",
      "2026-10-17T08:00:00.000Z",
    );
    expect(days.map((d) => d.date)).toEqual(["2026-10-15", "2026-10-16", "2026-10-17"]);
    expect(days[0]).toMatchObject({ succeeded: 0, failed: 0, avgDurationMs: null });
    expect(days[1]).toMatchObject({ succeeded: 3, failed: 1, avgDurationMs: 900 });
    expect(days[2].avgDurationMs).toBeNull();
  });

  it("returns no success rate rather than 0% when nothing ran", () => {
    expect(successRate({ total: 0, succeeded: 0, failed: 0, truncated: false })).toBeNull();
    expect(successRate({ total: 4, succeeded: 3, failed: 1, truncated: false })).toBe(0.75);
  });

  it("counts dead and permanently failed deliveries, not scheduled retries", () => {
    expect(undeliverable({ byStatus: { dead: 2, failed: 1, ready: 5, succeeded: 9 }, outcomeUnknown: 0 })).toBe(3);
  });

  it("orders job slices by lifecycle and keeps unknown statuses visible", () => {
    const s = jobSlices({ dead: 1, succeeded: 5, queued: 0, mystery: 2 });
    expect(s.map((x) => x.key)).toEqual(["succeeded", "dead", "mystery"]);
    expect(s.reduce((n, x) => n + x.value, 0)).toBe(8);
  });
});
