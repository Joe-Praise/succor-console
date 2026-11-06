"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { highlight, inferLang, type CodeLang } from "@/lib/highlight";

interface CodeBlockProps {
  /** The exact text rendered and copied. NEVER pass live secrets here — only
   *  placeholder env values and public request/callback examples. */
  code: string;
  /** Optional caption/filename shown in a header bar (e.g. ".env", "route.ts"). */
  label?: string;
  /** Force a language; otherwise it's guessed from the label and the first characters. */
  lang?: CodeLang;
  /** Controls placed in the header, before the copy button (e.g. language tabs). */
  actions?: React.ReactNode;
  className?: string;
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => toast.error("Couldn't copy — select the text manually"));
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy to clipboard"
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-[4px] text-faint transition-colors hover:bg-raised hover:text-foreground",
        className,
      )}
    >
      {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}

/**
 * Read-only code/config block with syntax tinting and copy. Purely presentational —
 * it renders whatever string it is handed and performs no data access.
 */
export function CodeBlock({ code, label, lang, actions, className }: CodeBlockProps) {
  const body = (
    <pre className="overflow-x-auto p-3.5 font-mono text-[12px] leading-[1.65] text-foreground/85">
      <code>{highlight(code, lang ?? inferLang(code, label))}</code>
    </pre>
  );

  if (label || actions) {
    return (
      <div className={cn("overflow-hidden rounded-xl border border-border bg-canvas", className)}>
        <div className="flex h-8 items-center justify-between gap-2 border-b border-border bg-surface pr-1 pl-3">
          <span className="truncate font-mono text-[11px] text-faint">{label}</span>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <CopyButton text={code} />
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-canvas", className)}>
      {body}
      <CopyButton text={code} className="absolute top-1.5 right-1.5 bg-canvas" />
    </div>
  );
}
