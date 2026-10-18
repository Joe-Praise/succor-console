import { cn } from "@/lib/utils";

/**
 * A "product shot" of the dark console placed on the light marketing page. The `.dark`
 * class scopes the app's dark tokens to this frame. The content is `inert`: it's a
 * picture of the product, not a working copy, so it takes no focus or clicks. The
 * "Illustrative" label is always visible because the data is sample data.
 */
export function PreviewFrame({
  path,
  caption,
  children,
  className,
}: {
  path: string;
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "dark overflow-hidden rounded-2xl border border-border bg-background text-left text-foreground",
        "shadow-[0_24px_60px_-20px_rgba(33,31,28,0.45)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
        <p className="truncate font-mono text-[11px] text-faint">{path}</p>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wider text-muted-foreground uppercase">
          Illustrative · sample data
        </span>
      </div>
      <div inert className="p-4 md:p-5">
        {children}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
