import { describe, expect, it } from "vitest";

import { bandPath, binEvents, durationStops, layoutChart, linePath, nearestIndex, niceDomain, pickXTicks, resample, sparkGeometry } from "./geometry";

const curveYs = (d: string) => [...d.matchAll(/[ ,C]-?[\d.]+,(-?[\d.]+)/g)].map((m) => Number(m[1]));

describe("niceDomain", () => {
  it("rounds outward to clean numbers", () => {
    const d = niceDomain(0, 87, 3);
    expect(d.ticks).toEqual([0, 50, 100]);
    expect(d.max).toBe(100);
  });

  it("keeps whole-number axes whole", () => {
    expect(niceDomain(0, 2, 4, true).ticks).toEqual([0, 1, 2]);
  });

  it("always passes through zero when mirrored", () => {
    expect(niceDomain(-4, 60, 3).ticks).toContain(0);
  });

  it("copes with a flat or empty series", () => {
    expect(niceDomain(0, 0).ticks).toEqual([0, 1]);
    expect(niceDomain(5, 5).max).toBeGreaterThanOrEqual(5);
  });
});

describe("linePath", () => {
  it("doesn't overshoot: a flat run then a rise never dips past its neighbours", () => {
    const d = linePath([0, 10, 20, 30], [100, 100, 100, 20]);
    const ys = curveYs(d);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(20);
  });

  it("breaks at a missing value instead of drawing through it", () => {
    const d = linePath([0, 10, 20, 30, 40], [5, 6, null, 7, 8]);
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it("still marks a single isolated point", () => {
    expect(linePath([0, 10, 20], [null, 5, null])).toContain("h0.01");
  });
});

describe("bandPath", () => {
  it("draws one closed band per gap-free stretch", () => {
    const d = bandPath([0, 10, 20, 30, 40], [1, 2, null, 3, 4], [9, 9, 9, 9, 9]);
    expect(d.match(/Z/g)).toHaveLength(2);
  });
});

describe("layoutChart", () => {
  const rows = [
    { label: "a", ok: 10, bad: 2 },
    { label: "b", ok: 20, bad: 4 },
  ];
  const base = { rows, xKey: "label", width: 406, height: 200 };

  it("stacks each series on the one before", () => {
    const g = layoutChart({ ...base, stacked: true, series: [{ key: "ok", label: "OK", color: "c" }, { key: "bad", label: "Bad", color: "c" }] });
    expect(g.layers[1].bases[1]).toBeCloseTo(g.layers[0].tops[1] as number);
    expect(g.layers[1].tops[1] as number).toBeLessThan(g.layers[0].tops[1] as number);
  });

  it("mirrors a down series below the baseline", () => {
    const g = layoutChart({
      ...base,
      series: [{ key: "ok", label: "OK", color: "c" }, { key: "bad", label: "Bad", color: "c", side: "down" }],
    });
    expect(g.layers[0].tops[1] as number).toBeLessThan(g.baseline);
    expect(g.layers[1].tops[1] as number).toBeGreaterThan(g.baseline);
    expect(g.layers[1].bases[1]).toBeCloseTo(g.baseline);
    expect(g.yTicks.map((t) => t.value)).toContain(0);
  });

  it("leaves a missing value as a gap rather than plotting zero", () => {
    const g = layoutChart({ ...base, rows: [{ label: "a", v: 1 }, { label: "b", v: null }], series: [{ key: "v", label: "V", color: "c" }] });
    expect(g.layers[0].tops[1]).toBeNull();
  });

  it("widens the domain to hold a reference line above the data", () => {
    const g = layoutChart({ ...base, series: [{ key: "ok", label: "OK", color: "c" }], references: [{ value: 200, label: "cap" }] });
    expect(g.references[0].y).toBeGreaterThanOrEqual(g.plot.top);
  });

  it("plots the prior period on the same axis", () => {
    const g = layoutChart({
      ...base,
      rows: [{ label: "a", v: 10, prior: 40 }, { label: "b", v: 10, prior: 40 }],
      ghostKey: "prior",
      series: [{ key: "v", label: "V", color: "c" }],
    });
    expect(g.ghost?.[0] as number).toBeLessThan(g.layers[0].tops[0] as number);
  });
});

describe("resample", () => {
  it("keeps both ends when stretching and squeezing", () => {
    const up = resample([0, 10], 5);
    expect(up[0]).toBe(0);
    expect(up[4]).toBe(10);
    expect(up[2]).toBe(5);
    const downs = resample([0, 5, 10, 15, 20], 3);
    expect(downs).toEqual([0, 10, 20]);
  });
});

describe("nearestIndex", () => {
  it("snaps to the closest position", () => {
    expect(nearestIndex([0, 100, 200], 140)).toBe(1);
    expect(nearestIndex([0, 100, 200], 999)).toBe(2);
  });
});

describe("pickXTicks", () => {
  it("always labels the newest point and never crowds", () => {
    const labels = Array.from({ length: 90 }, (_, i) => `d${i}`);
    const xs = labels.map((_, i) => i * 8);
    const ticks = pickXTicks(labels, xs, 64);
    expect(ticks[ticks.length - 1].label).toBe("d89");
    for (let i = 1; i < ticks.length; i++) expect(ticks[i].x - ticks[i - 1].x).toBeGreaterThanOrEqual(32);
  });
});

describe("sparkGeometry", () => {
  it("draws a flat series on the midline", () => {
    expect(sparkGeometry([3, 3, 3], 24).end?.y).toBe(12);
  });

  it("is empty with no data", () => {
    expect(sparkGeometry([null, null]).line).toBe("");
  });

  it("ends the dot on the last known value, not a trailing gap", () => {
    expect(sparkGeometry([1, 2, null]).end?.x).toBe(50);
  });
});

describe("binEvents", () => {
  it("counts each kind in its bin and includes the last instant", () => {
    const bins = binEvents(
      [
        { ts: 0, kind: "ok" },
        { ts: 50, kind: "fail" },
        { ts: 100, kind: "ok" },
      ],
      0,
      100,
      2,
    );
    expect(bins[0].counts).toEqual({ ok: 1 });
    expect(bins[1].counts).toEqual({ fail: 1, ok: 1 });
    expect(bins[1].total).toBe(2);
  });
});

describe("durationStops", () => {
  it("spans the data", () => {
    const stops = durationStops(2_000, 90_000);
    expect(stops[0]).toBeLessThanOrEqual(3_000);
    expect(stops[stops.length - 1]).toBeGreaterThanOrEqual(60_000);
  });

  it("gives at least two stops for a tight cluster", () => {
    expect(durationStops(12_000, 13_000).length).toBeGreaterThanOrEqual(2);
  });
});
