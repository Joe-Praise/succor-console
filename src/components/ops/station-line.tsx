"use client";

import Link from "next/link";
import { CheckIcon, LoaderCircleIcon, MinusIcon, PauseIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The signal line: stations a request passes through, joined by a wire that moves while
 * work is live. The product's one recurring picture: runs, approvals and the docs all draw
 * it from here.
 */

export type StationState = "done" | "active" | "waiting" | "failed" | "skipped" | "pending";

export interface Station {
  key: string;
  label: string;
  /** One short line under the label. */
  detail?: React.ReactNode;
  /** Right-aligned note, e.g. a timestamp. */
  note?: React.ReactNode;
  state: StationState;
  href?: string;
  onSelect?: () => void;
  selected?: boolean;
}

const NODE: Record<StationState, { cls: string; icon: React.ReactNode | null }> = {
  done: { cls: "border-success bg-success text-background", icon: <CheckIcon className="size-2.5" strokeWidth={3.5} /> },
  active: { cls: "border-info bg-info-bg text-info", icon: <LoaderCircleIcon className="size-3 animate-spin" strokeWidth={2.5} /> },
  waiting: { cls: "border-warning bg-warning-bg text-warning", icon: <PauseIcon className="size-2.5 fill-current" strokeWidth={0} /> },
  failed: { cls: "border-error bg-error text-background", icon: <XIcon className="size-2.5" strokeWidth={3.5} /> },
  skipped: { cls: "border-strong bg-transparent text-faint", icon: <MinusIcon className="size-2.5" strokeWidth={3} /> },
  pending: { cls: "border-strong bg-canvas text-faint", icon: null },
};

/** Which wire leaves this station: solid once passed, moving while the work is here. */
function wireFor(state: StationState, next: StationState): "passed" | "moving" | "idle" {
  if (state === "active") return "moving";
  if (state === "done" && next !== "pending") return "passed";
  if (state === "done" && next === "pending") return "moving";
  return "idle";
}

function Wire({ kind }: { kind: "passed" | "moving" | "idle" }) {
  return (
    <svg className="absolute top-1/2 left-0 h-1 w-full -translate-y-1/2 overflow-visible" aria-hidden preserveAspectRatio="none" viewBox="0 0 100 2">
      <line
        x1="0"
        y1="1"
        x2="100"
        y2="1"
        vectorEffect="non-scaling-stroke"
        strokeWidth={kind === "passed" ? 1.5 : 1.25}
        stroke={kind === "passed" ? "var(--success)" : kind === "moving" ? "var(--info)" : "var(--wire)"}
        className={kind === "moving" ? "signal-flow" : kind === "idle" ? "signal-idle" : undefined}
      />
    </svg>
  );
}

export function StationLine({ stations, className, compact }: { stations: Station[]; className?: string; compact?: boolean }) {
  return (
    <ol className={cn("flex w-full min-w-0 items-stretch overflow-x-auto no-scrollbar", className)}>
      {stations.map((s, i) => {
        const node = NODE[s.state];
        const next = stations[i + 1];
        const body = (
          <>
            <span className="relative flex h-5 items-center">
              <span className={cn("relative z-10 grid size-4.5 shrink-0 place-items-center rounded-full border", node.cls, s.state === "active" && "live-dot")}>
                {node.icon}
              </span>
              {next ? (
                <span className="relative ml-1.5 h-full flex-1">
                  <Wire kind={wireFor(s.state, next.state)} />
                </span>
              ) : null}
            </span>
            <span className={cn("block pr-3", compact ? "mt-1" : "mt-1.5")}>
              <span className={cn("block truncate text-[13px] font-semibold", s.state === "pending" || s.state === "skipped" ? "text-muted-foreground" : "text-foreground")}>
                {s.label}
              </span>
              {s.detail ? <span className="block truncate text-[11px] text-muted-foreground">{s.detail}</span> : null}
              {s.note ? <span className="block truncate text-[11px] text-faint tabular-nums">{s.note}</span> : null}
            </span>
          </>
        );
        const cls = cn(
          "block min-w-36 flex-1 rounded-md py-1.5 pl-1.5 text-left transition-colors last:flex-none last:pr-2",
          (s.href || s.onSelect) && "hover:bg-raised",
          s.selected && "bg-raised",
        );
        return (
          <li key={s.key} className={cn("min-w-36", next ? "flex-1" : "shrink-0")}>
            {s.href ? (
              <Link href={s.href} className={cn(cls, "w-full")}>
                {body}
              </Link>
            ) : s.onSelect ? (
              <button type="button" onClick={s.onSelect} aria-pressed={s.selected} className={cn(cls, "w-full")}>
                {body}
              </button>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
