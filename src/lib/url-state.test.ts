import { describe, it, expect } from "vitest";

import { parseFilters, applyFilterPatch } from "./url-filters";
import { rangeBounds, previousBounds, floorToMinute, isRangeKey } from "./time-range";

describe("URL filters", () => {
  it("reads only the declared keys, defaulting to empty", () => {
    const v = parseFilters(new URLSearchParams("status=dead&agent=quiz-generator&junk=1"), ["status", "agent", "range"] as const);
    expect(v).toEqual({ status: "dead", agent: "quiz-generator", range: "" });
  });

  it("round-trips a patch and removes cleared keys", () => {
    const start = new URLSearchParams("status=dead&agent=x&tab=cost");
    const next = applyFilterPatch(start, { status: null, agent: "y", range: "30d" });
    expect(next.get("status")).toBeNull();
    expect(next.get("agent")).toBe("y");
    expect(next.get("range")).toBe("30d");
    expect(next.get("tab")).toBe("cost"); // untouched keys survive
    expect(parseFilters(next, ["agent", "range"] as const)).toEqual({ agent: "y", range: "30d" });
  });
});

describe("time ranges", () => {
  const now = Date.parse("2026-10-18T12:34:56.789Z");

  it("rounds to the minute so the query key is stable", () => {
    expect(floorToMinute(now)).toBe(Date.parse("2026-10-18T12:34:00.000Z"));
    expect(rangeBounds("7d", now)).toEqual(rangeBounds("7d", now + 3_000));
  });

  it("computes the window and the equal-length previous window", () => {
    const b = rangeBounds("24h", now);
    expect(b.to).toBe("2026-10-18T12:34:00.000Z");
    expect(b.from).toBe("2026-10-17T12:34:00.000Z");
    const p = previousBounds(b);
    expect(p.to).toBe(b.from);
    expect(p.from).toBe("2026-10-16T12:34:00.000Z");
  });

  it("validates preset keys", () => {
    expect(isRangeKey("30d")).toBe(true);
    expect(isRangeKey("1y")).toBe(false);
  });
});
