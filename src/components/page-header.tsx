import { cn } from "@/lib/utils";

/**
 * Standard page heading.
 *   size="display" — serif display title (the warm editorial moment): settings,
 *                    onboarding, low-density pages.
 *   size="compact" — dense sans heading for operational pages (runs, usage, audit…),
 *                    where the data is the hero, not the title.
 */
export function PageHeader({
  title,
  description,
  action,
  size = "display",
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "display" | "compact";
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="font-mono text-[11px] tracking-[0.14em] text-faint uppercase">{eyebrow}</p>
        ) : null}
        {size === "compact" ? (
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        ) : (
          <h1
            className="font-serif text-foreground"
            style={{ fontSize: 32, lineHeight: "38px", fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            {title}
          </h1>
        )}
        {description ? (
          <p className={cn("text-muted-foreground", size === "compact" && "text-sm")}>{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
