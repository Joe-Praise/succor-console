import { CheckIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** The happy-path progression an agent request moves through. */
const STEPS = ["pending", "in_review", "approved", "building", "delivered"] as const;
const LABELS: Record<(typeof STEPS)[number], string> = {
  pending: "Pending",
  in_review: "In review",
  approved: "Approved",
  building: "Building",
  delivered: "Delivered",
};

/**
 * Horizontal stepper for an agent request's lifecycle. `rejected` is a terminal
 * off-ramp shown on its own; every other status maps onto the STEPS sequence.
 */
export function RequestTimeline({ status }: { status: string }) {
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-error">
        <span className="grid size-4 place-items-center rounded-full bg-error-bg">
          <XIcon className="size-2.5" />
        </span>
        Rejected
      </div>
    );
  }

  const found = STEPS.indexOf(status as (typeof STEPS)[number]);
  const idx = found === -1 ? 0 : found;

  return (
    <ol className="flex items-center overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-medium",
                  done
                    ? "bg-brand text-brand-foreground"
                    : active
                      ? "bg-brand-muted text-brand ring-1 ring-brand"
                      : "bg-raised text-faint",
                )}
              >
                {done ? <CheckIcon className="size-2.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[10px] whitespace-nowrap",
                  active ? "text-brand" : done ? "text-muted-foreground" : "text-faint",
                )}
              >
                {LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span className={cn("mx-1 h-px w-5 shrink-0", i < idx ? "bg-brand" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
