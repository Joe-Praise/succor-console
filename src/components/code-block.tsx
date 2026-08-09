"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  /** The exact text rendered and copied. NEVER pass live secrets here — only
   *  placeholder env values and public request/callback examples. */
  code: string;
  /** Optional caption/filename shown in a header bar (e.g. ".env", "route.ts"). */
  label?: string;
  className?: string;
}

/**
 * Read-only code/config block with copy-to-clipboard. Purely presentational —
 * it renders whatever string it is handed and performs no data access.
 */
export function CodeBlock({ code, label, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Couldn't copy — select the text manually"));
  }

  const copyBtn = (
    <Button variant="outline" size="icon-sm" aria-label="Copy to clipboard" onClick={copy}>
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
    </Button>
  );

  if (label) {
    return (
      <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
        <div className="flex items-center justify-between border-b border-border bg-raised px-3 py-1.5">
          <span className="font-mono text-xs text-faint">{label}</span>
          {copyBtn}
        </div>
        <pre className="overflow-x-auto bg-surface p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted-foreground">
        {code}
      </pre>
      <div className="absolute top-2 right-2">{copyBtn}</div>
    </div>
  );
}
