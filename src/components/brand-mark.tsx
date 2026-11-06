import { cn } from "@/lib/utils";

/**
 * The Succor mark: a signal passing through a station. One line, one lit node.
 * Used in the top bar, auth screens and marketing.
 */
export function BrandMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect x="0.5" y="0.5" width="23" height="23" rx="6" fill="var(--brand)" />
      <path
        d="M5 16.5c3.2 0 3.6-4.5 7-4.5s3.8-4.5 7-4.5"
        stroke="var(--brand-foreground)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.4" fill="var(--brand-foreground)" />
    </svg>
  );
}
