/**
 * The chart kit's arithmetic: domains, stacking, curves and tick placement. Pure and
 * framework-free so the shape of a chart is testable without a browser.
 */

/** Categorical slots, in the order that keeps neighbours distinct (see the note in globals.css). */
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
export const OTHERS_COLOR = "var(--text-tertiary)";

export type ChartRow = Record<string, string | number | null | undefined>;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  /** "down" plots below the baseline: failures under a mirrored outcome chart. */
  side?: "up" | "down";
}

export interface ChartReference {
  value: number;
  label: string;
  color?: string;
}

export interface Domain {
  min: number;
  max: number;
  ticks: number[];
}

function niceStep(span: number, count: number, integer: boolean): number {
  if (span <= 0 || !Number.isFinite(span)) return 1;
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return integer ? Math.max(1, Math.ceil(step)) : step;
}

/** Clean axis numbers (0 / 25 / 50, never 0 / 16.67 / 33.33), rounded outward to hold the data. */
export function niceDomain(min: number, max: number, count = 3, integer = false): Domain {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] };
  if (min === max) {
    if (max === 0) return { min: 0, max: 1, ticks: [0, 1] };
    return niceDomain(Math.min(0, min), Math.max(0, max), count, integer);
  }
  const step = niceStep(max - min, count, integer);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  const places = Math.max(0, -Math.floor(Math.log10(step))) + 2;
  for (let v = lo, i = 0; v <= hi + step / 2 && i < 64; v += step, i++) ticks.push(Number(v.toFixed(places)));
  return { min: lo, max: hi, ticks };
}

const fix = (n: number) => Math.round(n * 10) / 10;

interface XY {
  x: number;
  y: number;
}

/**
 * Monotone cubic segments (Fritsch–Carlson). Unlike a plain spline these never overshoot:
 * a curve through 0, 0, 40 doesn't dip below zero, so the line can't invent a value.
 */
function curveBody(pts: XY[]): string {
  const n = pts.length;
  if (n < 2) return "";
  if (n === 2) return `L${fix(pts[1].x)},${fix(pts[1].y)}`;
  const dx: number[] = [];
  const secant: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    secant[i] = dx[i] === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx[i];
  }
  const tangent: number[] = [secant[0]];
  for (let i = 1; i < n - 1; i++) {
    if (secant[i - 1] * secant[i] <= 0) tangent[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      tangent[i] = (w1 + w2) / (w1 / secant[i - 1] + w2 / secant[i]);
    }
  }
  tangent[n - 1] = secant[n - 2];
  let d = "";
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${fix(pts[i].x + h)},${fix(pts[i].y + tangent[i] * h)} ${fix(pts[i + 1].x - h)},${fix(pts[i + 1].y - tangent[i + 1] * h)} ${fix(pts[i + 1].x)},${fix(pts[i + 1].y)}`;
  }
  return d;
}

/** A line through the points. Nulls break it, so a missing day stays a gap, never a fake zero. */
export function linePath(xs: number[], ys: Array<number | null>): string {
  let d = "";
  let run: XY[] = [];
  const flush = () => {
    if (run.length === 1) d += `M${fix(run[0].x)},${fix(run[0].y)}h0.01`;
    else if (run.length > 1) d += `M${fix(run[0].x)},${fix(run[0].y)}${curveBody(run)}`;
    run = [];
  };
  ys.forEach((y, i) => {
    if (y === null) flush();
    else run.push({ x: xs[i], y });
  });
  flush();
  return d;
}

/** The filled band between two curves, one contiguous run per gap-free stretch. */
export function bandPath(xs: number[], tops: Array<number | null>, bases: number[]): string {
  let d = "";
  let top: XY[] = [];
  let base: XY[] = [];
  const flush = () => {
    if (top.length > 1) {
      const rev = [...base].reverse();
      d += `M${fix(top[0].x)},${fix(top[0].y)}${curveBody(top)}L${fix(rev[0].x)},${fix(rev[0].y)}${curveBody(rev)}Z`;
    }
    top = [];
    base = [];
  };
  tops.forEach((y, i) => {
    if (y === null) flush();
    else {
      top.push({ x: xs[i], y });
      base.push({ x: xs[i], y: bases[i] });
    }
  });
  flush();
  return d;
}

/** Stretch or squeeze a series to n points, so one range can morph into another. */
export function resample(values: number[], n: number): number[] {
  if (n <= 0) return [];
  if (values.length === 0) return Array.from({ length: n }, () => 0);
  if (values.length === 1 || n === 1) return Array.from({ length: n }, () => values[0]);
  return Array.from({ length: n }, (_, i) => {
    const at = (i / (n - 1)) * (values.length - 1);
    const lo = Math.floor(at);
    const hi = Math.min(values.length - 1, lo + 1);
    return values[lo] + (values[hi] - values[lo]) * (at - lo);
  });
}

export function nearestIndex(xs: number[], x: number): number {
  let best = 0;
  let dist = Infinity;
  xs.forEach((v, i) => {
    const d = Math.abs(v - x);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return best;
}

export interface XTick {
  x: number;
  label: string;
  anchor: "start" | "middle" | "end";
}

/** Label from the newest point backward, skipping whatever wouldn't fit. */
export function pickXTicks(labels: string[], xs: number[], minGap = 64): XTick[] {
  const n = labels.length;
  if (n === 0) return [];
  const width = xs[n - 1] - xs[0];
  const per = n > 1 ? width / (n - 1) : width;
  const stride = per > 0 ? Math.max(1, Math.ceil(minGap / per)) : 1;
  const out: XTick[] = [];
  for (let i = n - 1; i >= 0; i -= stride) {
    if (i < n - 1 && xs[i] - xs[0] < minGap * 0.5 && i !== 0) continue;
    out.unshift({ x: xs[i], label: labels[i], anchor: i === n - 1 && n > 1 ? "end" : i === 0 ? "start" : "middle" });
  }
  return out;
}

export interface ChartLayer extends ChartSeries {
  values: Array<number | null>;
  tops: Array<number | null>;
  bases: number[];
}

export interface ChartGeometry {
  plot: { left: number; right: number; top: number; bottom: number };
  xs: number[];
  yTicks: Array<{ y: number; value: number }>;
  xTicks: XTick[];
  baseline: number;
  layers: ChartLayer[];
  ghost: Array<number | null> | null;
  references: Array<{ y: number; label: string; color?: string }>;
}

export interface ChartInput {
  rows: ChartRow[];
  xKey: string;
  series: ChartSeries[];
  /** Pile the series on each other. Implied when any series plots below the baseline. */
  stacked?: boolean;
  ghostKey?: string;
  references?: ChartReference[];
  /** A fixed end, or "auto" to fit the data. The default floor is zero. */
  domain?: [number | "auto", number | "auto"];
  integer?: boolean;
  width: number;
  height: number;
  tickCount?: number;
}

function numberAt(row: ChartRow, key: string): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Everything a time chart draws, in pixels. */
export function layoutChart(input: ChartInput): ChartGeometry {
  const { rows, xKey, series, ghostKey, references = [], domain, integer, width, height, tickCount = 3 } = input;
  const stacked = input.stacked || series.some((s) => s.side === "down");
  const plot = { left: 0, right: Math.max(1, width - 6), top: 16, bottom: Math.max(17, height - 20) };
  const n = rows.length;
  const xs = rows.map((_, i) => (n > 1 ? plot.left + (i / (n - 1)) * (plot.right - plot.left) : (plot.left + plot.right) / 2));

  // Stack in data space first, so the domain is known before anything turns into pixels.
  const up = Array.from({ length: n }, () => 0);
  const down = Array.from({ length: n }, () => 0);
  const stackedSeries = series.map((s) => {
    const values = rows.map((r) => numberAt(r, s.key));
    if (!stacked) return { s, values, tops: values, bases: values.map(() => null as number | null) };
    const pile = s.side === "down" ? down : up;
    const sign = s.side === "down" ? -1 : 1;
    const bases = values.map((_, i) => pile[i] as number | null);
    const tops = values.map((v, i) => {
      pile[i] += sign * (v ?? 0);
      return pile[i];
    });
    return { s, values, tops, bases };
  });

  const ghostValues = ghostKey ? rows.map((r) => numberAt(r, ghostKey)) : null;
  const seen = [
    ...stackedSeries.flatMap((l) => l.tops.filter((v): v is number => v !== null)),
    ...(ghostValues ?? []).filter((v): v is number => v !== null),
    ...references.map((r) => r.value),
  ];
  const dataMin = seen.length ? Math.min(...seen) : 0;
  const dataMax = seen.length ? Math.max(...seen) : 1;

  const wantMin = domain?.[0];
  const wantMax = domain?.[1];
  // "auto" zooms a line in on its data; anything else starts at zero, or below it when mirrored.
  const lo = typeof wantMin === "number" ? wantMin : wantMin === "auto" ? dataMin - (dataMax - dataMin) * 0.15 : Math.min(0, dataMin);
  const hi = typeof wantMax === "number" ? wantMax : wantMax === "auto" ? dataMax + (dataMax - dataMin) * 0.1 : dataMax;
  // A mirrored chart keeps its scale from the top half, and gives the bottom only what it needs,
  // so a handful of failures doesn't reserve as much room as the whole successful side.
  const mirror = lo < 0 && wantMin === undefined;
  const nice = niceDomain(mirror ? 0 : lo, hi, tickCount, integer);
  const under = mirror ? -niceDomain(0, -lo, 1, integer).max : null;
  const dMin = typeof wantMin === "number" ? wantMin : (under ?? nice.min);
  const dMax = typeof wantMax === "number" ? wantMax : nice.max;
  const span = dMax - dMin || 1;
  const toY = (v: number) => plot.bottom - ((v - dMin) / span) * (plot.bottom - plot.top);
  const baseline = toY(Math.max(dMin, Math.min(dMax, 0)));

  return {
    plot,
    xs,
    baseline,
    yTicks: [...(under !== null ? [under] : []), ...nice.ticks].filter((t) => t >= dMin && t <= dMax).map((value) => ({ value, y: toY(value) })),
    xTicks: pickXTicks(rows.map((r) => String(r[xKey] ?? "")), xs),
    layers: stackedSeries.map(({ s, values, tops, bases }) => ({
      ...s,
      values,
      tops: tops.map((v) => (v === null ? null : toY(v))),
      bases: bases.map((v) => (v === null ? plot.bottom : toY(v))),
    })),
    ghost: ghostValues ? ghostValues.map((v) => (v === null ? null : toY(v))) : null,
    references: references.map((r) => ({ y: toY(r.value), label: r.label, color: r.color })),
  };
}

/** A sparkline's paths in a 100 × h box. A flat or empty series sits on the midline. */
export function sparkGeometry(values: Array<number | null>, h = 24) {
  const known = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (known.length === 0) return { line: "", area: "", end: null as XY | null };
  const min = Math.min(...known);
  const max = Math.max(...known);
  const pad = 2;
  const toY = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) / (max - min)) * (h - pad * 2));
  const n = values.length;
  const xs = values.map((_, i) => (n > 1 ? (i / (n - 1)) * 100 : 50));
  const ys = values.map((v) => (typeof v === "number" && Number.isFinite(v) ? toY(v) : null));
  let last = -1;
  ys.forEach((y, i) => {
    if (y !== null) last = i;
  });
  return {
    line: linePath(xs, ys),
    area: bandPath(xs, ys, xs.map(() => h)),
    end: last >= 0 ? { x: xs[last], y: ys[last] as number } : null,
  };
}

/** Evenly spread bins over a span. Each carries how many of each kind of event landed in it. */
export function binEvents<T extends string>(
  events: Array<{ ts: number; kind: T }>,
  from: number,
  to: number,
  count: number,
): Array<{ start: number; end: number; total: number; counts: Partial<Record<T, number>> }> {
  const span = Math.max(1, to - from);
  const size = span / Math.max(1, count);
  const bins = Array.from({ length: Math.max(1, count) }, (_, i) => ({
    start: from + i * size,
    end: from + (i + 1) * size,
    total: 0,
    counts: {} as Partial<Record<T, number>>,
  }));
  for (const e of events) {
    if (e.ts < from || e.ts > to) continue;
    const bin = bins[Math.min(bins.length - 1, Math.floor((e.ts - from) / size))];
    bin.total += 1;
    bin.counts[e.kind] = (bin.counts[e.kind] ?? 0) + 1;
  }
  return bins;
}

/** Duration axis stops on a log scale: a 2s run and a 2min run are both readable. */
export function durationStops(minMs: number, maxMs: number): number[] {
  const all = [100, 300, 1_000, 3_000, 10_000, 30_000, 60_000, 180_000, 600_000, 1_800_000, 3_600_000];
  const lo = Math.max(1, minMs);
  const inside = all.filter((v) => v >= lo * 0.7 && v <= maxMs * 1.4);
  if (inside.length >= 2) return inside;
  const below = [...all].reverse().find((v) => v <= lo) ?? all[0];
  const above = all.find((v) => v >= maxMs) ?? all[all.length - 1];
  return below === above ? [below, below * 3] : [below, above];
}
