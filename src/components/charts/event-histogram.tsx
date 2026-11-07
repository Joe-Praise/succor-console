"use client";

import { useMemo, useRef, useState } from "react";

import { gsap } from "@/lib/gsap";
import { binEvents, nearestIndex } from "./geometry";
import { useElementWidth, useOnFirstView } from "./hooks";
import { ChartReadout } from "./time-chart";

const BAR = 3;
const GAP = 2;

export interface HistogramKind<K extends string> {
  key: K;
  label: string;
  color: string;
}

/**
 * Traffic over time as a strip of hair-thin bars, one per slice of the window. Empty slices
 * keep a faint floor mark, so a quiet stretch reads as quiet rather than missing.
 */
export function EventHistogram<K extends string>({
  events,
  kinds,
  from,
  to,
  height = 56,
  timeLabel,
  ariaLabel,
}: {
  events: Array<{ ts: number; kind: K }>;
  kinds: Array<HistogramKind<K>>;
  from: number;
  to: number;
  height?: number;
  timeLabel: (t: number) => string;
  ariaLabel: string;
}) {
  const [hostRef, width] = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (width <= 0) return null;
    const count = Math.max(12, Math.min(160, Math.floor(width / (BAR + GAP))));
    const bins = binEvents(events, from, to, count);
    const max = Math.max(1, ...bins.map((b) => b.total));
    const step = width / count;
    return { bins, max, step, xs: bins.map((_, i) => i * step + step / 2) };
  }, [events, from, to, width]);

  useOnFirstView(
    svgRef,
    geo !== null,
    () => {
      const bars = svgRef.current?.querySelectorAll("[data-bar]");
      if (bars) gsap.set(bars, { scaleY: 0, transformOrigin: "50% 100%" });
    },
    () => {
      const bars = svgRef.current?.querySelectorAll("[data-bar]");
      if (!bars) return () => {};
      const tween = gsap.to(bars, { scaleY: 1, duration: 0.5, ease: "power3.out", stagger: { amount: 0.55 } });
      return () => tween.kill();
    },
    () => {
      const bars = svgRef.current?.querySelectorAll("[data-bar]");
      if (bars) gsap.set(bars, { clearProps: "transform,scale" });
    },
  );

  const plot = height - 2;
  const bin = active !== null ? geo?.bins[active] : undefined;

  return (
    <figure aria-label={ariaLabel} className="m-0">
      <div
        ref={hostRef}
        className="relative touch-pan-y"
        style={{ height }}
        onPointerMove={(e) => {
          if (geo) setActive(nearestIndex(geo.xs, e.clientX - e.currentTarget.getBoundingClientRect().left));
        }}
        onPointerLeave={() => setActive(null)}
      >
        {geo ? (
          <svg ref={svgRef} width={width} height={height} className="absolute top-0 left-0 overflow-visible" aria-hidden>
            <line x1={0} x2={width} y1={plot + 0.5} y2={plot + 0.5} stroke="var(--border)" shapeRendering="crispEdges" />
            {geo.bins.map((b, i) => {
              const x = i * geo.step + (geo.step - BAR) / 2;
              let y = plot;
              return (
                <g key={i} data-bar opacity={active !== null && active !== i ? 0.45 : 1} className="chart-emphasis">
                  {b.total === 0 ? (
                    <rect x={x} y={plot - 1} width={BAR} height={1} fill="var(--border-strong)" opacity={0.6} />
                  ) : (
                    kinds.map((k) => {
                      const n = b.counts[k.key] ?? 0;
                      if (!n) return null;
                      const h = Math.max(2, (n / geo.max) * (plot - 4));
                      y -= h;
                      const rect = <rect key={k.key} x={x} y={y} width={BAR} height={h} rx={1} fill={k.color} />;
                      y -= 1;
                      return rect;
                    })
                  )}
                </g>
              );
            })}
          </svg>
        ) : null}
        {geo && bin && active !== null ? (
          <ChartReadout
            x={geo.xs[active]}
            flip={geo.xs[active] > width / 2}
            title={`${timeLabel(bin.start)} – ${timeLabel(bin.end)}`}
            rows={kinds.map((k) => ({ key: k.key, color: k.color, label: k.label, value: String(bin.counts[k.key] ?? 0) }))}
          />
        ) : null}
      </div>
      <figcaption className="mt-1 flex justify-between font-mono text-[10px] text-faint tabular-nums">
        <span>{timeLabel(from)}</span>
        <span>{timeLabel(to)}</span>
      </figcaption>
    </figure>
  );
}
