import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";

/**
 * A product shot of the console: the same top-bar chrome, around content drawn by the
 * console's own components. It's `inert` because it's a picture, not a working copy, and the
 * "sample data" label is always visible because the numbers aren't real.
 */
export function PreviewFrame({
  path,
  tabs = ["Canvas", "Runs", "Observe", "Docs"],
  activeTab,
  caption,
  children,
  bleed,
  className,
}: {
  /** Breadcrumb after the mark, e.g. "northwind / runs". */
  path: string;
  tabs?: string[];
  activeTab?: string;
  caption: string;
  children: React.ReactNode;
  /** The content draws its own edge-to-edge surface (the canvas). */
  bleed?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-background text-left text-foreground shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]",
        className,
      )}
    >
      <div className="flex h-10 items-center gap-3 border-b border-border px-3">
        <BrandMark size={18} />
        <p className="truncate text-xs font-medium text-foreground/90">{path}</p>
        <nav className="ml-auto hidden items-center gap-3 md:flex" aria-hidden>
          {tabs.map((t) => (
            <span
              key={t}
              className={cn(
                "relative flex h-10 items-center text-[11px] font-medium",
                t === activeTab ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brand" : "text-faint",
              )}
            >
              {t}
            </span>
          ))}
        </nav>
        <span className="shrink-0 rounded-[3px] border border-border px-1.5 py-px font-mono text-[9.5px] tracking-wider text-faint uppercase md:ml-1">
          Sample data
        </span>
      </div>
      <div inert className={bleed ? undefined : "p-3 md:p-4"}>
        {children}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
