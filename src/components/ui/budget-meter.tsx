"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

function usd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface BudgetMeterProps {
  spent: number;
  /** null → no cap set (unlimited). */
  budget: number | null;
  className?: string;
}

/**
 * Budget meter (§4.5): horizontal bar + `$X of $Y (Z%)` in tabular-nums.
 * States: ok (accent, <80%) · warn (amber, ≥80%) · exceeded (error + 45°
 * stripe overlay + banner). Fill animates once on load, unless reduced motion.
 */
export function BudgetMeter({ spent, budget, className }: BudgetMeterProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const pct = budget && budget > 0 ? (spent / budget) * 100 : 0;
  const clamped = Math.min(pct, 100);
  const state = pct >= 100 ? "exceeded" : pct >= 80 ? "warn" : "ok";

  useEffect(() => {
    const el = fillRef.current;
    if (!el || budget == null) return;
    if (prefersReducedMotion()) {
      el.style.width = `${clamped}%`;
      return;
    }
    const anim = gsap.fromTo(
      el,
      { width: "0%" },
      { width: `${clamped}%`, duration: 0.6, ease: "power2.out" },
    );
    return () => {
      anim.kill();
    };
  }, [clamped, budget]);

  if (budget == null) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Spend this month</span>
          <span className="tabular-nums font-medium text-foreground">
            {usd(spent)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-raised" />
        <p className="text-xs text-faint">No budget cap set.</p>
      </div>
    );
  }

  const fillColor =
    state === "exceeded"
      ? "bg-error"
      : state === "warn"
        ? "bg-warning"
        : "bg-brand";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="tabular-nums text-muted-foreground">
          {usd(spent)}{" "}
          <span className="text-faint">of {usd(budget)}</span>
        </span>
        <span
          className={cn(
            "tabular-nums font-medium",
            state === "exceeded"
              ? "text-error"
              : state === "warn"
                ? "text-warning"
                : "text-foreground",
          )}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Budget ${Math.round(pct)}% used`}
      >
        <div
          ref={fillRef}
          style={{ width: `${clamped}%` }}
          className={cn("relative h-full rounded-full", fillColor)}
        >
          {state === "exceeded" ? (
            <span className="stripe-overlay absolute inset-0" aria-hidden />
          ) : null}
        </div>
      </div>
      {state === "exceeded" ? (
        <p className="text-xs text-error">
          Budget exceeded — agents return{" "}
          <span className="font-mono">402</span> until the cap is raised or the
          month resets.
        </p>
      ) : state === "warn" ? (
        <p className="text-xs text-warning">Approaching budget cap.</p>
      ) : null}
    </div>
  );
}
