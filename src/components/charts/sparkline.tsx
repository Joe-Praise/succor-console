"use client";

import { useId, useMemo } from "react";

import { cn } from "@/lib/utils";
import { sparkGeometry } from "./geometry";
import { svgId } from "./hooks";

const BOX_H = 24;

/**
 * A trend small enough to sit beside a number. It draws in a 100-wide box stretched to fit,
 * so the stroke is kept from scaling and the end dot lives in HTML to stay round.
 */
export function Sparkline({
  values,
  color = "var(--chart-1)",
  wash = true,
  dot = true,
  className,
}: {
  values: Array<number | null>;
  color?: string;
  wash?: boolean;
  dot?: boolean;
  className?: string;
}) {
  const uid = svgId(useId());
  const { line, area, end } = useMemo(() => sparkGeometry(values, BOX_H), [values]);

  if (!line) {
    return <span className={cn("block h-6 w-full", className)} aria-hidden />;
  }
  return (
    <span className={cn("relative block h-6 w-full", className)} aria-hidden>
      <svg viewBox={`0 0 100 ${BOX_H}`} preserveAspectRatio="none" className="spark-wipe absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={`${uid}-w`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.24} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {wash ? <path d={area} fill={`url(#${uid}-w)`} /> : null}
        <path d={line} fill="none" stroke={color} strokeWidth={1.25} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {dot && end ? (
        <span
          className="chart-pop-html absolute size-1.25 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${end.x}%`, top: `${(end.y / BOX_H) * 100}%`, background: color }}
        />
      ) : null}
    </span>
  );
}
