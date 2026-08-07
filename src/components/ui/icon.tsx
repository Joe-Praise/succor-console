import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface IconProps {
  icon: LucideIcon;
  /** px — 16 in chrome (§4.5). */
  size?: number;
  className?: string;
  /**
   * Accessible name for icon-only affordances. When omitted the icon is
   * decorative and hidden from assistive tech (§4.7).
   */
  label?: string;
}

/**
 * Single icon set (Lucide), one fixed size in chrome, `text-secondary` by
 * default. Never emoji. Callers restyle via className (e.g. `text-brand`).
 */
export function Icon({ icon: IconCmp, size = 16, className, label }: IconProps) {
  return (
    <IconCmp
      width={size}
      height={size}
      strokeWidth={2}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("shrink-0 text-muted-foreground", className)}
    />
  );
}
