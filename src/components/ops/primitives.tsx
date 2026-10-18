"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CopyIcon,
  InfoIcon,
  TriangleAlertIcon,
  CircleCheckIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { shortId } from "@/lib/format";
import { deliveryLabel, deliveryTone, TONE_BG, type Tone } from "@/lib/status";
import { Skeleton } from "@/components/ui/skeleton";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// IdChip — a mono identifier with copy. Interactive, so it never triggers row nav.
// ---------------------------------------------------------------------------

export function IdChip({
  id,
  full = false,
  label,
  className,
}: {
  id: string;
  /** Show the whole id instead of the last 8 characters. */
  full?: boolean;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard
      .writeText(id)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Couldn't copy — select the text manually"));
  }
  return (
    <span
      className={cn(
        "relative z-10 inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background/60 py-0.5 pr-0.5 pl-1.5 font-mono text-[11px] text-muted-foreground",
        className,
      )}
      title={id}
    >
      {label ? <span className="text-faint">{label}</span> : null}
      <span className="truncate text-foreground">{full ? id : shortId(id)}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label ?? "id"}`}
        className="grid size-5 shrink-0 place-items-center rounded text-faint transition-colors hover:bg-raised hover:text-foreground"
      >
        {copied ? <CheckIcon className="size-3 text-success" /> : <CopyIcon className="size-3" />}
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Callout — the one banner (replaces eight hand-rolled copies).
// ---------------------------------------------------------------------------

const CALLOUT_TONE: Record<"info" | "warning" | "error" | "success", { cls: string; icon: LucideIcon }> = {
  info: { cls: "bg-info-bg text-info", icon: InfoIcon },
  warning: { cls: "bg-warning-bg text-warning", icon: TriangleAlertIcon },
  error: { cls: "bg-error-bg text-error", icon: CircleAlertIcon },
  success: { cls: "bg-success-bg text-success", icon: CircleCheckIcon },
};

export function Callout({
  tone = "info",
  title,
  children,
  href,
  action,
  className,
}: {
  tone?: keyof typeof CALLOUT_TONE;
  title?: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = CALLOUT_TONE[tone];
  const body = (
    <>
      <t.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {href ? <ChevronRightIcon className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
    </>
  );
  const cls = cn("flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm", t.cls, className);
  return href ? (
    <Link href={href} className={cn(cls, "transition-opacity hover:opacity-90")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const TONE_ICON: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  faint: "text-faint",
  brand: "text-brand",
};

// ---------------------------------------------------------------------------
// KpiCard — every metric states its definition and period; "unavailable" is a
// first-class state, never a fake zero.
// ---------------------------------------------------------------------------

export function KpiCard({
  label,
  value,
  sub,
  definition,
  delta,
  goodWhen = "up",
  unavailable,
  loading,
  icon: Icon,
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  /** Period / context line, e.g. "last 7 days". */
  sub?: React.ReactNode;
  /** What the number means and where it comes from (shown on hover). */
  definition?: string;
  /** Change vs the previous period, as a ratio (0.12 = +12%). */
  delta?: number | null;
  goodWhen?: "up" | "down";
  /** Reason the metric can't be shown — rendered instead of a value. */
  unavailable?: string | null;
  loading?: boolean;
  icon?: LucideIcon;
  href?: string;
  tone?: Tone;
}) {
  const deltaGood = delta == null ? null : goodWhen === "up" ? delta >= 0 : delta <= 0;
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {Icon ? <Icon className={cn("size-3.5", tone ? TONE_ICON[tone] : "text-faint")} aria-hidden /> : null}
          {label}
        </span>
        {definition ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="relative z-10 grid size-4 cursor-help place-items-center rounded-full text-faint hover:text-foreground"
                  aria-label={`About ${label}`}
                >
                  <InfoIcon className="size-3.5" />
                </span>
              }
            />
            <TooltipContent className="max-w-64">{definition}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="mt-2 min-h-8">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : unavailable ? (
          <p className="text-sm text-faint">{unavailable}</p>
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {!loading && !unavailable && delta != null ? (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", deltaGood ? "text-success" : "text-error")}>
            {delta >= 0 ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
            {`${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`}
          </span>
        ) : null}
        {sub ? <span className="truncate text-faint">{sub}</span> : null}
      </div>
    </>
  );
  const cls = "relative block rounded-xl border border-border bg-surface p-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-strong")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

// ---------------------------------------------------------------------------
// StatusTriplet — job · run outcome · delivery, never collapsed into one.
// ---------------------------------------------------------------------------

export function StatusTriplet({
  jobStatus,
  runStatus,
  delivery,
  className,
}: {
  jobStatus: string;
  runStatus: string | null;
  delivery: { status: string; error?: string | null; attempt?: number } | null;
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs", className)}>
      <div className="flex items-center gap-1.5">
        <dt className="text-faint">Job</dt>
        <dd>
          <AnyStatusBadge value={jobStatus} />
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="text-faint">Outcome</dt>
        <dd>{runStatus ? <AnyStatusBadge value={runStatus} /> : <span className="text-faint">not yet</span>}</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="text-faint">Delivery</dt>
        <dd>{delivery ? <DeliveryBadge delivery={delivery} /> : <span className="text-faint">none recorded</span>}</dd>
      </div>
    </dl>
  );
}

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted-foreground bg-raised",
  info: "text-info bg-info-bg",
  success: "text-success bg-success-bg",
  warning: "text-warning bg-warning-bg",
  error: "text-error bg-error-bg",
  faint: "text-faint bg-transparent",
  brand: "text-brand bg-brand-muted",
};

/** A delivery effect's state, with "retry scheduled" distinguished from a first attempt. */
export function DeliveryBadge({
  delivery,
  className,
}: {
  delivery: { status: string; error?: string | null; attempt?: number };
  className?: string;
}) {
  const tone = deliveryTone(delivery);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_TEXT[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", TONE_BG[tone])} aria-hidden />
      {deliveryLabel(delivery)}
    </span>
  );
}

/** A small colored dot for a tone (lists, legends). */
export function ToneDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", TONE_BG[tone], className)} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Breadcrumbs + Facts
// ---------------------------------------------------------------------------

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRightIcon className="size-3 text-faint" aria-hidden /> : null}
            {it.href ? (
              <Link href={it.href} className="hover:text-foreground">
                {it.label}
              </Link>
            ) : (
              <span className="font-mono text-foreground" aria-current="page">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface Fact {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

export function FactGrid({ facts, className }: { facts: Fact[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {facts.map((f) => (
        <div key={f.label} className="min-w-0 space-y-1">
          <dt className="text-xs text-faint" title={f.hint}>
            {f.label}
          </dt>
          <dd className="min-w-0 truncate text-sm text-foreground">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A labelled section inside a page — title, one muted line, optional actions. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** "Load more" for keyset-paginated lists. */
export function CursorPager({
  hasMore,
  loading,
  onLoadMore,
  count,
  noun = "rows",
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  count: number;
  noun?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-faint">
      <span className="tabular-nums">
        {count.toLocaleString()} {noun} loaded
      </span>
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-raised disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      ) : (
        <span>End of results</span>
      )}
    </div>
  );
}
