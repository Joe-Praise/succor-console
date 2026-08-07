"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SecretRevealProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The full secret — shown exactly once, never retrievable again. */
  secret: string;
  /** e.g. "API key" / "Callback key". */
  label: string;
  /** Non-secret scheme prefix kept visible while masked (e.g. "ask_live_"). */
  prefix?: string;
}

/**
 * One-time secret reveal (§4.5). Masked by default with DOTS (never blur) +
 * a reveal toggle; a large Copy button flips to "Copied ✓"; dismissal requires
 * the explicit "I've stored this key" confirm. States plainly that the key is
 * never retrievable again. Afterwards only `prefix…last4` renders anywhere.
 */
export function SecretReveal({
  open,
  onOpenChange,
  secret,
  label,
  prefix,
}: SecretRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset transient UI each time the modal opens.
  useEffect(() => {
    if (open) {
      setRevealed(false);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      /* clipboard blocked — user can still reveal + copy manually */
    }
  }

  const masked = `${prefix ?? ""}${"•".repeat(20)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Save your {label}</DialogTitle>
          <DialogDescription>
            This is the only time it will be shown. Store it somewhere safe —
            it can&apos;t be retrieved again.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
          <code
            className={cn(
              "min-w-0 flex-1 font-mono text-sm leading-relaxed break-all",
              revealed ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {revealed ? secret : masked}
          </code>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide" : "Reveal"}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>

        <Button onClick={copy} className="w-full" variant={copied ? "secondary" : "default"}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : `Copy ${label.toLowerCase()}`}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          I&apos;ve stored this key
        </Button>
      </DialogContent>
    </Dialog>
  );
}
