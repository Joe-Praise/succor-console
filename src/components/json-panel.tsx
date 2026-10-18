"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  const [copied, setCopied] = useState(false);
  const isEmpty = value === null || value === undefined;
  const text = isEmpty ? "" : typeof value === "string" ? value : JSON.stringify(value, null, 2);

  function copy() {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Couldn't copy — select the text manually"));
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-raised px-3 py-1.5">
        <span className="truncate font-mono text-xs text-faint">{label ?? "json"}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Copy JSON"
          onClick={copy}
          disabled={isEmpty}
        >
          {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
        </Button>
      </div>
      {isEmpty ? (
        <p className="bg-surface px-4 py-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <pre
          className={cn(
            "overflow-auto bg-surface p-4 font-mono text-xs leading-relaxed text-muted-foreground",
            maxHeight,
          )}
        >
          {text}
        </pre>
      )}
    </div>
  );
}
