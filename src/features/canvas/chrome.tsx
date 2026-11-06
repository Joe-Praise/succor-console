"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  CircleDashedIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
  PackagePlusIcon,
  PlugZapIcon,
  PlusIcon,
  RocketIcon,
  WebhookIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";

import { useProfile } from "@/features/governance/hooks";
import { successRate, undeliverable } from "@/features/executions/ops";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { RANGE_PRESETS, type RangeKey } from "@/lib/time-range";
import { cn } from "@/lib/utils";
import { compactNumber, duration, percent, relativeTime, shortId } from "@/lib/format";
import { toneOf } from "@/lib/status";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToneDot } from "@/components/ops/primitives";
import type { CanvasData } from "@/features/canvas/use-canvas-data";

function Metric({ label, value, tone, href }: { label: string; value: string; tone?: string; href: string }) {
  return (
    <Link href={href} className="group flex items-baseline gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-raised">
      <span className={cn("text-[13px] font-semibold tabular-nums", tone ?? "text-foreground")}>{value}</span>
      <span className="text-[11px] whitespace-nowrap text-faint group-hover:text-muted-foreground">{label}</span>
    </Link>
  );
}

/** The project's vital signs, floating over the canvas. Each number opens its list. */
export function HealthStrip({
  data,
  base,
  range,
  onRange,
}: {
  data: CanvasData;
  base: string;
  range: RangeKey;
  onRange: (r: RangeKey) => void;
}) {
  const s = data.summary.data;
  const rate = s ? successRate(s.runs) : null;
  const live = s ? (s.live["queued"] ?? 0) + (s.live["running"] ?? 0) : 0;
  const lost = s ? undeliverable(s.deliveries) : 0;
  return (
    <div data-canvas-ui className="flex max-w-full items-stretch divide-x divide-hairline overflow-x-auto tile no-scrollbar">
      <div role="radiogroup" aria-label="Time range" className="flex items-center gap-0.5 px-1">
        {RANGE_PRESETS.filter((p) => p.key !== "90d").map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={range === p.key}
            onClick={() => onRange(p.key)}
            className={cn(
              "h-5 rounded-[3px] px-1.5 text-[11px] font-medium tabular-nums transition-colors",
              range === p.key ? "bg-raised text-foreground" : "text-faint hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Metric label="success" value={rate === null ? "—" : percent(rate)} href={`${base}/observe?range=${range}`} tone={rate !== null && rate < 0.9 ? "text-warning" : undefined} />
      <Metric label="runs" value={s ? compactNumber(s.runs.total) : "—"} href={`${base}/runs?range=${range}`} />
      <Metric label="live" value={String(live)} href={`${base}/runs?status=queued%2Crunning`} tone={live ? "text-info" : undefined} />
      <Metric label="waiting" value={String(data.waiting)} href={`${base}/approvals`} tone={data.waiting ? "text-warning" : undefined} />
      <Metric label="undelivered" value={String(lost)} href={`${base}/callbacks?result=failed`} tone={lost ? "text-error" : undefined} />
      <Metric label="p95" value={duration(s?.durationMs.p95)} href={`${base}/observe?range=${range}`} />
    </div>
  );
}

/** The canvas's "Create": what you can add to this project, in one place. */
export function CreateMenu({ base }: { base: string }) {
  const items = [
    { href: `${base}/playground`, icon: FlaskConicalIcon, label: "Run an agent", hint: "In the playground, callbacks captured" },
    { href: `${base}/keys`, icon: KeyRoundIcon, label: "API key", hint: "Connect your backend" },
    { href: `${base}/settings`, icon: WebhookIcon, label: "Callback URL", hint: "Where results land" },
    { href: `${base}/workflows`, icon: WorkflowIcon, label: "Workflow", hint: "Chain agents durably" },
    { href: `${base}/tools`, icon: PlugZapIcon, label: "MCP server", hint: "Let agents read your systems" },
    { href: `${base}/agents`, icon: PackagePlusIcon, label: "Custom agent", hint: "Request one we don't have" },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" data-canvas-ui>
            <PlusIcon />
            Create
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>What do you need?</DropdownMenuLabel>
          {items.map((i) => (
            <DropdownMenuItem key={i.href} render={<Link href={i.href} />}>
              <i.icon />
              <span>{i.label}</span>
              <span className="ml-auto truncate pl-3 text-[11px] text-faint">{i.hint}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Recent activity, newest first: runs started and callbacks attempted. */
export function ActivityDock({ data, base, projectId, shifted }: { data: CanvasData; base: string; projectId: string; shifted: boolean }) {
  const [open, setOpen] = useState(false);
  const { nameOf } = useAgentNames(projectId);
  const runs = data.recentRuns.slice(0, 14).map((r) => ({
    key: `r${r.id}`,
    ts: new Date(r.createdAt).getTime(),
    href: `${base}/runs/${r.id}`,
    tone: toneOf(r.status),
    live: r.status === "running",
    title: nameOf(r.agentType),
    meta: r.status.replace(/_/g, " "),
    mono: shortId(r.id),
  }));
  const deliveries = (data.callbacks.data?.deliveries ?? []).slice(0, 14).map((d) => {
    const id = d.id ?? d._id ?? "";
    return {
      key: `d${id}`,
      ts: new Date(d.ts).getTime(),
      href: `${base}/callbacks/${id}`,
      tone: d.ok ? ("success" as const) : ("error" as const),
      live: false,
      title: `Callback ${d.ok ? "delivered" : "failed"}`,
      meta: nameOf(d.agentType),
      mono: String(d.responseStatus ?? "no response"),
    };
  });
  const events = [...runs, ...deliveries].sort((a, b) => b.ts - a.ts).slice(0, 20);
  const latest = events[0];

  return (
    <div
      data-canvas-ui
      className={cn(
        "absolute bottom-3 z-20 w-[min(340px,calc(100%-64px))] overflow-hidden tile transition-[right] duration-200",
        shifted ? "right-3 lg:right-[436px]" : "right-3",
      )}
    >
      {open ? (
        <ul className="max-h-80 overflow-y-auto border-b border-border py-1">
          {events.length === 0 ? (
            <li className="px-3 py-4 text-[13px] text-muted-foreground">No activity yet.</li>
          ) : (
            events.map((e) => (
              <li key={e.key}>
                <Link href={e.href} className="flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-raised">
                  <ToneDot tone={e.tone} className={e.live ? "animate-pulse" : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-foreground">{e.title}</span>
                    <span className="block truncate text-[11px] text-faint">
                      {e.meta} · <span className="font-mono">{e.mono}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-faint tabular-nums">{relativeTime(new Date(e.ts))}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-8 w-full items-center gap-2 px-2.5 text-left text-xs transition-colors hover:bg-raised"
      >
        <ActivityIcon className="size-3.5 text-faint" />
        <span className="font-medium text-foreground">Activity</span>
        {!open && latest ? (
          <span className="min-w-0 flex-1 truncate text-[11px] text-faint">
            {latest.title} · {relativeTime(new Date(latest.ts))}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        {open ? <ChevronDownIcon className="size-3.5 text-faint" /> : <ChevronUpIcon className="size-3.5 text-faint" />}
      </button>
    </div>
  );
}

/** Go-live steps, derived entirely from live state. Disappears once complete. */
export function GoLiveCard({ data, base, projectId, hasRuns }: { data: CanvasData; base: string; projectId: string; hasRuns: boolean | null }) {
  const profile = useProfile(projectId);
  const [collapsed, setCollapsed] = useState(false);
  const steps = [
    { done: data.setup.data?.status === "approved", label: "Project approved", hint: "The platform approves it before agents run.", href: null },
    { done: data.agents.length > 0, label: "Agents enabled", hint: "Browse the catalog.", href: `${base}/agents` },
    { done: !!data.project?.apiBaseUrls?.some((u) => !!u.url), label: "Callback URL set", hint: "Where results are delivered.", href: `${base}/settings` },
    { done: (data.keys.data?.keys ?? []).some((k) => !k.revokedAt), label: "API key created", hint: "Your backend's credential.", href: `${base}/keys` },
    { done: !!profile.data?.profile, label: "Business described", hint: "Optional: makes output sound like you.", href: `${base}/profile` },
    { done: !!hasRuns, label: "First run", hint: "Try the playground, or call from your backend.", href: `${base}/playground` },
  ];
  const loading = data.setup.isLoading || data.keys.isLoading || data.projects.isLoading || profile.isLoading || hasRuns === null;
  const done = steps.filter((s) => s.done).length;
  if (loading || done === steps.length) return null;

  return (
    <div data-canvas-ui className="absolute bottom-3 left-3 z-20 w-72 max-w-[calc(100%-24px)] overflow-hidden tile">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        className="flex h-8 w-full items-center gap-2 px-2.5 text-left text-xs transition-colors hover:bg-raised"
      >
        <RocketIcon className="size-3.5 text-brand" />
        <span className="font-medium text-foreground">Go live</span>
        <span className="flex-1 font-mono text-[11px] text-faint tabular-nums">
          {done}/{steps.length}
        </span>
        {collapsed ? <ChevronUpIcon className="size-3.5 text-faint" /> : <XIcon className="size-3 text-faint" />}
      </button>
      {collapsed ? null : (
        <ol className="border-t border-border py-1">
          {steps.map((s) => {
            const inner = (
              <>
                <span
                  className={cn(
                    "mt-px grid size-4 shrink-0 place-items-center rounded-full",
                    s.done ? "bg-success text-background" : "border border-strong text-faint",
                  )}
                >
                  {s.done ? <CheckIcon className="size-2.5" strokeWidth={3} /> : <CircleDashedIcon className="size-2.5" />}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-xs", s.done ? "text-faint line-through" : "font-medium text-foreground")}>{s.label}</span>
                  {!s.done ? <span className="block text-[11px] text-muted-foreground">{s.hint}</span> : null}
                </span>
              </>
            );
            return (
              <li key={s.label}>
                {s.href && !s.done ? (
                  <Link href={s.href} className="flex items-start gap-2 px-2.5 py-1.5 transition-colors hover:bg-raised">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2 px-2.5 py-1.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
