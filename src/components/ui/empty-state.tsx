import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** One bold line. */
  title: string;
  /** One muted line. */
  description: string;
  /** Exactly one primary action (§4.5). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Empty state (§4.5): one bold line + one muted line + one action.
 * No mascots, no emoji, no multi-CTA.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <Icon icon={icon} size={20} className="mb-2 text-faint" />
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
