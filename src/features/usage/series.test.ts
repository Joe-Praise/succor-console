import { describe, it, expect } from "vitest";

import { burnSeries, dayKeys, priorByDay, stackBy, totalsOf, OTHERS_KEY } from "./series";
import type { UsageBucket } from "@/types";

const b = (period: string, agentType: string, billedUsd: number, statuses: Record<string, number> = { success: 1 }): UsageBucket => ({
  period,
  agentType,
  runs: Object.values(statuses).reduce((s, n) => s + n, 0),
  inputTokens: 100,
  outputTokens: 50,
  embeddingTokens: 0,
  costUsd: billedUsd / 2,
  billedUsd,
  statuses,
});

describe("usage series", () => {
  it("totals runs, money, tokens and failures (failures from statuses, not guessed)", () => {
    const t = totalsOf([b("2026-10-01", "a", 1, { success: 3, error: 1 }), b("2026-10-02", "b", 2, { validation_failed: 2 })]);
    expect(t).toMatchObject({ runs: 6, billedUsd: 3, costUsd: 1.5, failed: 3, tokens: 300 });
  });

  it("stacks by group with zero-filled periods", () => {
    const s = stackBy([b("2026-10-01", "a", 1), b("2026-10-02", "b", 2)], "agentType", "billedUsd");
    expect(s.data).toHaveLength(2);
    expect(s.data[0]).toMatchObject({ period: "2026-10-01", a: 1, b: 0 });
    expect(s.data[1]).toMatchObject({ a: 0, b: 2 });
    expect(s.legend.map((l) => l.key)).toEqual(["b", "a"]); // ranked by total
  });

  it("folds the long tail into Others and conserves the total", () => {
    const buckets = ["a", "b", "c", "d"].map((k, i) => b("2026-10-01", k, i + 1));
    const s = stackBy(buckets, "agentType", "billedUsd", 2);
    expect(s.series.map((x) => x.key)).toEqual(["d", "c", OTHERS_KEY]);
    expect(s.data[0][OTHERS_KEY]).toBe(3); // a(1) + b(2)
    const legendTotal = s.legend.reduce((sum, l) => sum + l.value, 0);
    expect(legendTotal).toBe(10);
  });

  it("keeps quiet days on the axis as zeros, matching timestamped periods on the date", () => {
    const days = dayKeys("2026-10-01T09:00:00.000Z", "2026-10-03T09:00:00.000Z");
    expect(days).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    const s = stackBy([b("2026-10-01T00:00:00.000Z", "a", 1), b("2026-10-03T00:00:00.000Z", "a", 2)], "agentType", "billedUsd", 5, (k) => k, (p) => p, { days });
    expect(s.data.map((r) => r.a)).toEqual([1, 0, 2]);
  });

  it("gives a group the same colour whichever metric is showing", () => {
    const buckets = [
      { ...b("2026-10-01", "cheap", 1), runs: 100 },
      { ...b("2026-10-01", "costly", 50), runs: 1 },
    ];
    const opts = { rankBy: "billedUsd" as const };
    const money = stackBy(buckets, "agentType", "billedUsd", 5, (k) => k, (p) => p, opts);
    const runs = stackBy(buckets, "agentType", "runs", 5, (k) => k, (p) => p, opts);
    const color = (l: typeof money.legend, k: string) => l.find((x) => x.key === k)?.color;
    expect(color(runs.legend, "costly")).toBe(color(money.legend, "costly"));
    expect(runs.legend[0].key).toBe("cheap"); // still sorted by what's shown
  });

  it("lines the previous window's days up by position", () => {
    expect(priorByDay([b("2026-09-02T00:00:00.000Z", "a", 4), b("2026-09-02T00:00:00.000Z", "b", 1)], "billedUsd", ["2026-09-01", "2026-09-02"])).toEqual([0, 5]);
  });
});

describe("burnSeries", () => {
  const label = (p: string) => p;
  const at = (iso: string) => Date.parse(iso);

  it("accumulates to today and stops, leaving the future empty rather than flat", () => {
    const burn = burnSeries([b("2026-11-01T00:00:00.000Z", "a", 10), b("2026-11-05T00:00:00.000Z", "a", 5)], at("2026-11-10T00:00:00.000Z"), 100, label);
    expect(burn.rows).toHaveLength(30);
    expect(burn.spent).toBe(15);
    expect(burn.rows[0].spent).toBe(10);
    expect(burn.rows[9].spent).toBe(15);
    expect(burn.rows[10].spent).toBeNull();
  });

  it("joins the pace line to today's total and extends it to month end", () => {
    const burn = burnSeries([b("2026-11-01T00:00:00.000Z", "a", 90)], at("2026-11-10T00:00:00.000Z"), 200, label);
    expect(burn.rows[9].pace).toBe(90);
    expect(burn.rows[8].pace).toBeNull();
    expect(burn.projected).toBeCloseTo(90 + 10 * 20); // $90 over 9 days elapsed is $10 a day
    expect(burn.capDay).toBe("2026-11-21");
  });

  it("doesn't project from the first days of a month", () => {
    const burn = burnSeries([b("2026-11-01T00:00:00.000Z", "a", 90)], at("2026-11-02T00:00:00.000Z"), 200, label);
    expect(burn.projected).toBeNull();
    expect(burn.rows.every((r) => r.pace === null)).toBe(true);
    expect(burn.capDay).toBeNull();
  });
});
