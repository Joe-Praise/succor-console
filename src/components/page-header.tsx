import { cn } from "@/lib/utils";

/**
 * Standard page heading. The data is the hero, so headings stay small and sans in the
 * app; the serif belongs to marketing and docs. `size` only adjusts the title step:
 *   "display" — low-density pages (settings, onboarding)
 *   "compact" — operational pages (runs, usage, audit)
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
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-0.5">
        {eyebrow ? <p className="kicker">{eyebrow}</p> : null}
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "compact" ? "text-[17px] leading-6" : "text-xl leading-7",
          )}
        >
          {title}
        </h1>
        {description ? <p className="max-w-3xl text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
