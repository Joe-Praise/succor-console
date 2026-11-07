"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { bandPath, layoutChart, linePath, nearestIndex, resample, type ChartGeometry, type ChartReference, type ChartRow, type ChartSeries } from "./geometry";
import { svgId, useChartSync, useElementWidth, useReveal } from "./hooks";

export type TimeSeries = ChartSeries & {
  /** A dashed line with no wash, for a projection rather than something recorded. */
  dashed?: boolean;
};

export interface TimeChartProps {
  rows: ChartRow[];
  series: TimeSeries[];
  xKey?: string;
  stacked?: boolean;
  /** A faint line for the same stretch of the previous period, on the same axis. */
  ghost?: { key: string; label: string };
  references?: ChartReference[];
  height?: number;
  format: (v: number) => string;
  /** A shorter form for axis labels ($8 where the readout says $8.00). Defaults to `format`. */
  axisFormat?: (v: number) => string;
  domain?: [number | "auto", number | "auto"];
  integer?: boolean;
  tickCount?: number;
  /** Charts sharing an id share a crosshair. */
  syncId?: string;
  /** Brings one series forward and quiets the rest (driven by a breakdown list, say). */
  highlight?: string | null;
  /** "keys" draws only the prior-period and reference keys, for when a breakdown names the series. */
  legend?: boolean | "keys";
  /** Show the newest value beside a single line. */
  endValue?: boolean;
  ariaLabel: string;
  className?: string;
}

const complete = (a: Array<number | null>) => (a.every((v) => v !== null) ? (a as number[]) : null);

/**
 * Tween every line and band from where it was to where it now belongs.
 *
 * Only a change in the plotted values starts a tween. Related data often lands a moment later
 * (the prior period, say, which can rescale the axis), so each frame aims at the latest layout
 * rather than the one it started with: the tween carries on and still lands exactly right.
 */
function useMorph(svgRef: React.RefObject<SVGSVGElement | null>, geo: ChartGeometry | null, signature: string) {
  const latest = useRef(geo);
  const settled = useRef<{ signature: string; layers: Map<string, { tops: number[]; bases: number[] }> } | null>(null);
  const ready = geo !== null;

  useLayoutEffect(() => {
    latest.current = geo;
  });

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const start = latest.current;
    const last = settled.current;
    if (!svg || !start || !last || last.signature === signature || prefersReducedMotion()) return;

    const n = start.xs.length;
    const baseline = Array.from({ length: n }, () => start.baseline);
    const moves = start.layers.flatMap((l) => {
      // A line with a gap can't be interpolated point for point; it just takes its new shape.
      if (!complete(l.tops)) return [];
      const from = last.layers.get(l.key);
      const key = CSS.escape(l.key);
      return [
        {
          key: l.key,
          fromTops: from ? resample(from.tops, n) : baseline,
          fromBases: from ? resample(from.bases, n) : baseline,
          line: svg.querySelector(`[data-line="${key}"]`),
          area: svg.querySelector(`[data-area="${key}"]`),
        },
      ];
    });
    const paint = (t: number) => {
      const now = latest.current;
      if (!now) return;
      for (const m of moves) {
        const layer = now.layers.find((l) => l.key === m.key);
        const toTops = layer && complete(layer.tops);
        if (!layer || !toTops) continue;
        const tops = toTops.map((v, i) => m.fromTops[i] + (v - m.fromTops[i]) * t);
        const bases = layer.bases.map((v, i) => m.fromBases[i] + (v - m.fromBases[i]) * t);
        m.line?.setAttribute("d", linePath(now.xs, tops));
        m.area?.setAttribute("d", bandPath(now.xs, tops, bases));
      }
    };
    paint(0);
    const state = { t: 0 };
    const tween = gsap.to(state, { t: 1, duration: 0.65, ease: "power2.inOut", onUpdate: () => paint(state.t) });
    return () => {
      tween.kill();
      paint(1);
    };
  }, [svgRef, ready, signature]);

  // Last, so the tween above read the shape from before this change.
  useLayoutEffect(() => {
    if (!geo) return;
    const layers = new Map<string, { tops: number[]; bases: number[] }>();
    for (const l of geo.layers) {
      const tops = complete(l.tops);
      if (tops) layers.set(l.key, { tops, bases: l.bases });
    }
    settled.current = { signature, layers };
  }, [geo, signature]);
}

/**
 * The console's time chart: thin lines over a soft wash, a crosshair that glides between
 * points, one readout listing every series, and shapes that morph when the data changes.
 */
export function TimeChart({
  rows,
  series,
  xKey = "label",
  stacked,
  ghost,
  references,
  height = 176,
  format,
  axisFormat = format,
  domain,
  integer,
  tickCount,
  syncId,
  highlight,
  legend = true,
  endValue,
  ariaLabel,
  className,
}: TimeChartProps) {
  const [hostRef, width] = useElementWidth<HTMLDivElement>();
  const uid = svgId(useId());
  const svgRef = useRef<SVGSVGElement>(null);
  const revealRef = useRef<SVGRectElement>(null);
  const [pointer, setPointer] = useState<number | null>(null);
  const [legendKey, setLegendKey] = useState<string | null>(null);
  const [syncedLabel, setSyncedLabel] = useChartSync(syncId);

  const mirrored = series.some((s) => s.side === "down");
  const piled = !!stacked || mirrored;
  const geo = useMemo(
    () =>
      width > 0
        ? layoutChart({ rows, xKey, series, stacked, ghostKey: ghost?.key, references, domain, integer, tickCount, width, height })
        : null,
    [rows, xKey, series, stacked, ghost?.key, references, domain, integer, tickCount, width, height],
  );
  const signature = useMemo(() => JSON.stringify(rows.map((r) => series.map((s) => r[s.key]))), [rows, series]);

  useReveal(svgRef, revealRef, geo !== null);
  useMorph(svgRef, geo, signature);

  const labels = rows.map((r) => String(r[xKey] ?? ""));
  const syncedIndex = syncedLabel === null ? -1 : labels.indexOf(syncedLabel);
  const active = pointer ?? (syncedIndex >= 0 ? syncedIndex : null);
  const focusKey = highlight ?? legendKey;
  const single = series.length === 1;

  const point = (i: number | null) => {
    setPointer(i);
    setSyncedLabel(i === null ? null : labels[i]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (rows.length === 0) return;
    const last = rows.length - 1;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      point(Math.max(0, Math.min(last, (active ?? last) + step)));
    } else if (e.key === "Home") {
      e.preventDefault();
      point(0);
    } else if (e.key === "End") {
      e.preventDefault();
      point(last);
    } else if (e.key === "Escape") point(null);
  };

  const legendItems = [
    ...(legend === true && series.length > 1 ? series.map((s) => ({ key: s.key, label: s.label, color: s.color, thin: false })) : []),
    ...(legend && ghost ? [{ key: "__ghost", label: ghost.label, color: "var(--chart-ghost)", thin: true }] : []),
  ];

  return (
    <figure aria-label={ariaLabel} className={cn("m-0 min-w-0", className)}>
      {legendItems.length ? (
        <ul className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {legendItems.map((l) => (
            <li
              key={l.key}
              className="flex items-center gap-1.5"
              onPointerEnter={() => !l.thin && setLegendKey(l.key)}
              onPointerLeave={() => setLegendKey(null)}
            >
              <span
                className={cn("w-2.5", l.thin ? "h-px" : "h-0.5 rounded-full")}
                style={l.thin ? { backgroundImage: `repeating-linear-gradient(90deg, ${l.color} 0 2px, transparent 2px 4px)` } : { background: l.color }}
                aria-hidden
              />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        ref={hostRef}
        tabIndex={0}
        role="group"
        aria-label={`${ariaLabel}. Use the arrow keys to read each day.`}
        className="relative touch-pan-y rounded-[4px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ height }}
        onPointerMove={(e) => {
          if (!geo) return;
          point(nearestIndex(geo.xs, e.clientX - e.currentTarget.getBoundingClientRect().left));
        }}
        onPointerLeave={() => point(null)}
        onKeyDown={onKeyDown}
        onBlur={() => point(null)}
      >
        {geo ? (
          <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0 overflow-visible" aria-hidden>
            <defs>
              <clipPath id={`${uid}-reveal`}>
                <rect ref={revealRef} x={-8} y={-8} width={100000} height={height + 16} />
              </clipPath>
              {geo.layers.map((l, i) => (
                <linearGradient
                  key={l.key}
                  id={`${uid}-w${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={0}
                  x2={0}
                  y1={l.side === "down" ? geo.plot.bottom : geo.plot.top}
                  y2={geo.baseline}
                >
                  <stop offset="0" stopColor={l.color} stopOpacity={piled && !mirrored ? 0.34 : 0.3} />
                  <stop offset="1" stopColor={l.color} stopOpacity={piled && !mirrored ? 0.1 : 0.015} />
                </linearGradient>
              ))}
            </defs>

            {geo.yTicks.map((t) => (
              <g key={t.value} className="chart-glide-slow chart-fade" style={{ transform: `translateY(${t.y}px)` }}>
                <line x1={geo.plot.left} x2={width} y1={0} y2={0} stroke={t.value === 0 ? "var(--border-strong)" : "var(--chart-grid)"} shapeRendering="crispEdges" />
              </g>
            ))}

            <g clipPath={`url(#${uid}-reveal)`}>
              {geo.ghost ? (
                <path d={linePath(geo.xs, geo.ghost)} fill="none" stroke="var(--chart-ghost)" strokeWidth={1} strokeDasharray="2 3" strokeLinecap="round" />
              ) : null}
              {geo.layers.map((l, i) => {
                const dashed = (series[i] as TimeSeries | undefined)?.dashed;
                const washed = !dashed && (piled || single);
                const quiet = !!focusKey && focusKey !== l.key;
                return (
                  <g key={l.key} className="chart-emphasis" style={{ opacity: quiet ? 0.14 : 1 }}>
                    {washed ? <path data-area={l.key} d={bandPath(geo.xs, l.tops, l.bases)} fill={`url(#${uid}-w${i})`} /> : null}
                    <path
                      data-line={l.key}
                      d={linePath(geo.xs, l.tops)}
                      fill="none"
                      stroke={l.color}
                      strokeWidth={focusKey === l.key ? 2 : 1.5}
                      strokeDasharray={dashed ? "3 4" : undefined}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </g>

            {/* Labels sit above the data, so a wash can't bury them. */}
            {geo.yTicks.map((t) => (
              <text key={t.value} className="chart-tick chart-glide-slow chart-fade" x={geo.plot.left} y={-4} style={{ transform: `translateY(${t.y}px)` }}>
                {axisFormat(Math.abs(t.value))}
              </text>
            ))}
            {geo.xTicks.map((t) => (
              <text key={`${t.label}${t.x}`} x={t.x} y={height - 4} textAnchor={t.anchor} className="chart-tick">
                {t.label}
              </text>
            ))}

            {geo.references.map((r) => (
              <g key={r.label}>
                <line x1={geo.plot.left} x2={width} y1={r.y} y2={r.y} stroke={r.color ?? "var(--text-tertiary)"} strokeDasharray="1 3" strokeLinecap="round" />
                <text x={width} y={r.y - 4} textAnchor="end" className="chart-tick" style={{ fill: "var(--text-secondary)" }}>
                  {r.label}
                </text>
              </g>
            ))}

            {active === null && (!piled || mirrored)
              ? geo.layers.map((l) => {
                  if ((series.find((s) => s.key === l.key) as TimeSeries | undefined)?.dashed) return null;
                  let at = -1;
                  l.tops.forEach((v, i) => {
                    if (v !== null) at = i;
                  });
                  if (at < 0) return null;
                  const value = l.values[at];
                  return (
                    <g key={l.key}>
                      <circle cx={geo.xs[at]} cy={l.tops[at] as number} r={3.5} fill={l.color} stroke="var(--surface)" strokeWidth={2} className="chart-pop" />
                      {endValue && single && value !== null ? (
                        <text x={geo.xs[at] - 8} y={(l.tops[at] as number) - 9} textAnchor="end" className="chart-tick chart-pop" style={{ fill: "var(--foreground)" }}>
                          {format(value)}
                        </text>
                      ) : null}
                    </g>
                  );
                })
              : null}

            {active !== null && geo.xs[active] !== undefined ? (
              <g className="chart-glide" style={{ transform: `translateX(${geo.xs[active]}px)` }}>
                <line x1={0} x2={0} y1={geo.plot.top} y2={geo.plot.bottom} stroke="var(--border-strong)" shapeRendering="crispEdges" />
                {geo.layers.map((l) => {
                  const y = l.tops[active];
                  if (y === null || (piled && !l.values[active])) return null;
                  return <circle key={l.key} className="chart-glide" style={{ transform: `translateY(${y}px)` }} r={3.5} fill={l.color} stroke="var(--surface)" strokeWidth={2} />;
                })}
              </g>
            ) : null}
          </svg>
        ) : null}

        {geo && pointer !== null && geo.xs[pointer] !== undefined ? (
          <ChartReadout
            x={geo.xs[pointer]}
            flip={geo.xs[pointer] > width / 2}
            title={labels[pointer]}
            rows={(piled && !mirrored ? [...geo.layers].reverse() : geo.layers)
              .filter((l) => l.values[pointer] !== null)
              .map((l) => ({ key: l.key, color: l.color, label: l.label, value: format(l.values[pointer] as number), dashed: (series.find((s) => s.key === l.key) as TimeSeries | undefined)?.dashed }))}
            total={piled && !mirrored && geo.layers.length > 1 ? format(geo.layers.reduce((n, l) => n + (l.values[pointer] ?? 0), 0)) : undefined}
            ghost={
              ghost && typeof rows[pointer]?.[ghost.key] === "number"
                ? { label: ghost.label, value: format(rows[pointer][ghost.key] as number) }
                : undefined
            }
          />
        ) : null}
      </div>

      {/* Clipped on a wrapper: a table can't be made narrower than its contents, so sr-only on
          the table itself would still stretch the page. */}
      <div className="sr-only">
      <table>
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${labels[i]}${i}`}>
              <th scope="row">{labels[i]}</th>
              {series.map((s) => {
                const v = r[s.key];
                return <td key={s.key}>{typeof v === "number" ? format(v) : "No data"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

/** The hover card: every series at this point, value first. */
export function ChartReadout({
  x,
  flip,
  title,
  rows,
  total,
  ghost,
  note,
}: {
  x: number;
  flip: boolean;
  title: string;
  rows: Array<{ key: string; color: string; label: string; value: string; dashed?: boolean }>;
  total?: string;
  ghost?: { label: string; value: string };
  note?: string;
}) {
  return (
    <div
      aria-hidden
      className="chart-tip chart-glide"
      style={{ transform: `translate3d(${x}px, 0, 0) translateX(${flip ? "calc(-100% - 14px)" : "14px"})` }}
    >
      <p className="mb-1 text-[10.5px] text-faint">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[10px_auto_minmax(0,1fr)] items-center gap-x-1.5">
            <span className="h-0.5 w-2.5 rounded-full" style={{ background: r.color, opacity: r.dashed ? 0.6 : 1 }} />
            <span className="font-medium text-foreground tabular-nums">{r.value}</span>
            <span className="truncate pl-1 text-muted-foreground">{r.label}</span>
          </li>
        ))}
      </ul>
      {note ? <p className="mt-1 border-t border-hairline pt-1 text-muted-foreground">{note}</p> : null}
      {total || ghost ? (
        <div className="mt-1 space-y-0.5 border-t border-hairline pt-1">
          {total ? (
            <p className="grid grid-cols-[10px_auto_minmax(0,1fr)] items-center gap-x-1.5">
              <span />
              <span className="font-medium text-foreground tabular-nums">{total}</span>
              <span className="pl-1 text-muted-foreground">Total</span>
            </p>
          ) : null}
          {ghost ? (
            <p className="grid grid-cols-[10px_auto_minmax(0,1fr)] items-center gap-x-1.5">
              <span className="h-px w-2.5" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--chart-ghost) 0 2px, transparent 2px 4px)" }} />
              <span className="text-muted-foreground tabular-nums">{ghost.value}</span>
              <span className="truncate pl-1 text-faint">{ghost.label}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
