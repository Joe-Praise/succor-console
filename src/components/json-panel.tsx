"use client";

import { cn } from "@/lib/utils";
import { highlight } from "@/lib/highlight";
import { CopyButton } from "@/components/code-block";

/**
 * Read-only JSON viewer for run outputs, held deliveries and attested schemas.
 * Scrolls inside a fixed max height so a large result never pushes the page.
 * `null`/`undefined` render an explicit empty line instead of the string "null".
 */
export function JsonPanel({
  value,
  label,
  empty = "Nothing here.",
  className,
  maxHeight = "max-h-96",
}: {
  value: unknown;
  label?: string;
  empty?: string;
  className?: string;
  maxHeight?: string;
}) {
  const isEmpty = value === null || value === undefined;
  const isString = typeof value === "string";
  const text = isEmpty ? "" : isString ? (value as string) : JSON.stringify(value, null, 2);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-canvas", className)}>
      <div className="flex h-8 items-center justify-between gap-2 border-b border-border bg-surface pr-1 pl-3">
        <span className="truncate font-mono text-[11px] text-faint">{label ?? "json"}</span>
        {isEmpty ? null : <CopyButton text={text} />}
      </div>
      {isEmpty ? (
        <p className="px-3.5 py-3 text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <pre className={cn("overflow-auto p-3.5 font-mono text-[12px] leading-[1.65] text-foreground/85", maxHeight)}>
          <code>{highlight(text, isString ? "text" : "json")}</code>
        </pre>
      )}
    </div>
  );
}
