"use client";

import { RotateCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Inline error state for a failed query. Paired with a query's `isError` so
 * every request has a visible failure path (never a silent blank or infinite
 * spinner) plus a retry affordance wired to `refetch()`.
 */
export function QueryError({
  message = "Couldn't load this right now.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-strong px-6 py-10 text-center " +
        (className ?? "")
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCwIcon />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
