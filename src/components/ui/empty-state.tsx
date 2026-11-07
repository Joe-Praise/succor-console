import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** One bold line. */
  title: string;
  /** One muted line. */
  description: string;
  /** Exactly one primary action. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty state: an idle stretch of the signal line with one station waiting on it,
 * then one bold line, one muted line, one action.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "canvas-dots flex flex-col items-center justify-center rounded-xl border border-border px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="relative mb-4 flex h-11 w-64 max-w-full items-center justify-center" aria-hidden>
          <svg className="absolute inset-0 size-full text-wire" preserveAspectRatio="none" viewBox="0 0 256 44" fill="none">
            <line x1="0" y1="22" x2="256" y2="22" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute left-[14%] size-2 rounded-full border border-wire bg-canvas" />
          <span className="absolute right-[14%] size-2 rounded-full border border-wire bg-canvas" />
          <span className="tile relative grid size-11 place-items-center bg-raised">
            <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
          </span>
        </div>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
