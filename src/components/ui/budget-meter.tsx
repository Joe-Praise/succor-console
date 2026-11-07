"use client";

import { cn } from "@/lib/utils";
import { usd } from "@/lib/format";
import { TickMeter } from "@/components/charts/meters";

interface BudgetMeterProps {
  spent: number;
  /** null → no cap set (unlimited). */
  budget: number | null;
  className?: string;
}

/**
 * Budget meter (§4.5): fine ticks + `$X of $Y (Z%)` in tabular-nums.
 * States: ok (accent, <80%) · warn (amber, ≥80%) · exceeded (error + banner).
 * The mark at 80% is where the platform alert fires.
 */
export function BudgetMeter({ spent, budget, className }: BudgetMeterProps) {
  const pct = budget && budget > 0 ? (spent / budget) * 100 : 0;
  const state = pct >= 100 ? "exceeded" : pct >= 80 ? "warn" : "ok";

  if (budget == null) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Spend this month</span>
          <span className="tabular-nums font-medium text-foreground">
            {usd(spent)}
          </span>
        </div>
        <p className="text-xs text-faint">No budget cap set.</p>
      </div>
    );
  }

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
      <TickMeter
        value={pct / 100}
        threshold={0.8}
        tone={state === "exceeded" ? "error" : state === "warn" ? "warning" : "brand"}
        label={`Budget ${Math.round(pct)}% used`}
      />
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
