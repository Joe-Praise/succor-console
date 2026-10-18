import { describe, it, expect } from "vitest";

import { stackBy, totalsOf, OTHERS_KEY } from "./series";
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
});
