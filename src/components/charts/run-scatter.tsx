"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { gsap } from "@/lib/gsap";
import { durationStops, pickXTicks } from "./geometry";
import { useElementWidth, useOnFirstView } from "./hooks";
import { ChartReadout } from "./time-chart";

export interface ScatterPoint {
  id: string;
  ts: number;
  value: number;
  failed: boolean;
  title: string;
  detail: string;
  href?: string;
}

const HIT_RADIUS = 28;

/**
 * Every run as a dot: when it ran against how long it took, on a log axis so a two-second run
 * and a two-minute run are both readable. A failure is a larger ring, not only a red dot, so
 * it still stands out to someone who can't separate red from green.
 */
export function RunScatter({
  points,
  from,
  to,
  references = [],
  height = 208,
  format,
  axisFormat = format,
  dayLabel,
  ariaLabel,
}: {
  points: ScatterPoint[];
  from: number;
  to: number;
  references?: Array<{ value: number; label: string }>;
  height?: number;
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  dayLabel: (t: number) => string;
  ariaLabel: string;
}) {
  const [hostRef, width] = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (width <= 0 || points.length === 0) return null;
    const plot = { left: 0, right: width - 6, top: 16, bottom: height - 20 };
    const values = [...points.map((p) => p.value), ...references.map((r) => r.value)];
    const stops = durationStops(Math.min(...values), Math.max(...values));
    const logMin = Math.log10(stops[0]);
    const logMax = Math.log10(stops[stops.length - 1]);
    const toY = (v: number) => plot.bottom - ((Math.log10(Math.max(v, 1)) - logMin) / (logMax - logMin || 1)) * (plot.bottom - plot.top);
    const span = Math.max(1, to - from);
    const toX = (t: number) => plot.left + ((t - from) / span) * (plot.right - plot.left);
    const sorted = [...points].sort((a, b) => a.ts - b.ts);
    const count = Math.max(2, Math.min(8, Math.floor(width / 90)));
    const tickTimes = Array.from({ length: count }, (_, i) => from + (i / (count - 1)) * span);
    return {
      plot,
      dots: sorted.map((p) => ({ ...p, x: toX(p.ts), y: toY(p.value) })),
      yTicks: stops.map((value) => ({ value, y: toY(value) })),
      xTicks: pickXTicks(tickTimes.map(dayLabel), tickTimes.map(toX), 64),
      refs: references.map((r) => ({ ...r, y: toY(r.value) })),
    };
  }, [points, references, from, to, width, height, dayLabel]);

  // Dots land left to right. Polling adds new ones later without replaying this.
  useOnFirstView(
    svgRef,
    geo !== null,
    () => {
      const dots = svgRef.current?.querySelectorAll("[data-dot]");
      if (dots) gsap.set(dots, { opacity: 0 });
    },
    () => {
      const dots = svgRef.current?.querySelectorAll("[data-dot]");
      if (!dots) return () => {};
      const tween = gsap.to(dots, { opacity: 1, duration: 0.3, ease: "power1.out", stagger: { amount: 0.75 } });
      return () => tween.kill();
    },
    () => {
      const dots = svgRef.current?.querySelectorAll("[data-dot]");
      if (dots) gsap.set(dots, { clearProps: "opacity" });
    },
  );

  const dots = geo?.dots ?? [];
  const hit = active !== null ? dots[active] : undefined;

  const onMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    let best: number | null = null;
    let dist = HIT_RADIUS;
    dots.forEach((d, i) => {
      const dd = Math.hypot(d.x - x, d.y - y);
      if (dd < dist) {
        dist = dd;
        best = i;
      }
    });
    setActive(best);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!dots.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.max(0, Math.min(dots.length - 1, (a ?? dots.length - 1) + step)));
    } else if (e.key === "Enter" && hit?.href) {
      router.push(hit.href);
    } else if (e.key === "Escape") setActive(null);
  };

  return (
    <div
      ref={hostRef}
      tabIndex={0}
      role="group"
      aria-label={`${ariaLabel}. Use the arrow keys to step through runs, Enter to open one.`}
      className="relative touch-pan-y rounded-[4px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
      style={{ height, cursor: hit?.href ? "pointer" : "default" }}
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
      onClick={() => {
        if (hit?.href) router.push(hit.href);
      }}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
    >
      {geo ? (
        <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0 overflow-visible" aria-hidden>
          {geo.yTicks.map((t) => (
            <g key={t.value}>
              <line x1={0} x2={width} y1={t.y} y2={t.y} stroke="var(--chart-grid)" shapeRendering="crispEdges" />
              <text x={0} y={t.y - 4} className="chart-tick">
                {axisFormat(t.value)}
              </text>
            </g>
          ))}
          {geo.xTicks.map((t) => (
            <text key={`${t.label}${t.x}`} x={t.x} y={height - 4} textAnchor={t.anchor} className="chart-tick">
              {t.label}
            </text>
          ))}
          {geo.refs.map((r) => (
            <g key={r.label}>
              <line x1={0} x2={width} y1={r.y} y2={r.y} stroke="var(--text-tertiary)" strokeDasharray="1 3" strokeLinecap="round" />
              <text x={width} y={r.y - 4} textAnchor="end" className="chart-tick" style={{ fill: "var(--text-secondary)" }}>
                {r.label}
              </text>
            </g>
          ))}
          {geo.dots.map((d) =>
            d.failed ? (
              <circle key={d.id} data-dot cx={d.x} cy={d.y} r={3.5} fill="var(--surface)" stroke="var(--error)" strokeWidth={1.5} />
            ) : (
              <circle key={d.id} data-dot cx={d.x} cy={d.y} r={2} fill="var(--success)" fillOpacity={0.62} />
            ),
          )}
          {hit ? (
            <g className="chart-glide" style={{ transform: `translate(${hit.x}px, ${hit.y}px)` }}>
              <line x1={0} x2={0} y1={geo.plot.top - hit.y} y2={geo.plot.bottom - hit.y} stroke="var(--border-strong)" shapeRendering="crispEdges" />
              <circle r={6} fill="none" stroke={hit.failed ? "var(--error)" : "var(--success)"} strokeWidth={1.25} />
              <circle r={2.5} fill={hit.failed ? "var(--error)" : "var(--success)"} />
            </g>
          ) : null}
        </svg>
      ) : null}
      {hit ? (
        <ChartReadout
          x={hit.x}
          flip={hit.x > width / 2}
          title={hit.title}
          rows={[{ key: "d", color: hit.failed ? "var(--error)" : "var(--success)", label: hit.failed ? "Failed" : "Succeeded", value: format(hit.value) }]}
          note={hit.detail}
        />
      ) : null}
    </div>
  );
}
