"use client";

import {
  BookOpenTextIcon,
  ChartLineIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleIcon,
  EyeIcon,
  GlobeIcon,
  GraduationCapIcon,
  LoaderCircleIcon,
  PenLineIcon,
  PlugZapIcon,
  SearchIcon,
  SendIcon,
  ServerIcon,
  StampIcon,
  TriangleAlertIcon,
  WorkflowIcon,
  WrenchIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { compactNumber, percent, relativeTime, usd } from "@/lib/format";
import { BrandMark } from "@/components/brand-mark";
import type { CatalogEntry, McpServer } from "@/types";
import type { AgentStat, CanvasData, EndpointStat } from "@/features/canvas/use-canvas-data";

export const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  seo: { label: "SEO", icon: SearchIcon },
  content: { label: "Content", icon: PenLineIcon },
  analysis: { label: "Analysis", icon: ChartLineIcon },
  elearning: { label: "E-learning", icon: GraduationCapIcon },
  vision: { label: "Vision", icon: EyeIcon },
  utility: { label: "Utility", icon: WrenchIcon },
};

export function categoryOf(category: string) {
  return CATEGORY_META[category] ?? { label: category, icon: BookOpenTextIcon };
}

type StateTone = "ok" | "live" | "warn" | "error" | "idle";

const STATE_ICON: Record<StateTone, { icon: LucideIcon; cls: string }> = {
  ok: { icon: CheckCircle2Icon, cls: "text-success" },
  live: { icon: LoaderCircleIcon, cls: "text-info animate-spin" },
  warn: { icon: StampIcon, cls: "text-warning" },
  error: { icon: XCircleIcon, cls: "text-error" },
  idle: { icon: CircleIcon, cls: "text-faint" },
};

export function StateLine({ tone, children }: { tone: StateTone; children: React.ReactNode }) {
  const s = STATE_ICON[tone];
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <s.icon className={cn("size-3.5 shrink-0", s.cls)} strokeWidth={2} aria-hidden />
      <span className="truncate">{children}</span>
    </p>
  );
}

/** Runs per day in the window, as bars. Real data only: no history, no bars. */
export function Spark({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  if (values.every((v) => v === 0)) return <span className={cn("h-3.5", className)} aria-hidden />;
  return (
    <span className={cn("flex h-3.5 items-end gap-px", className)} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-[1px]", v > 0 ? "bg-chart-2/70" : "bg-border")}
          style={{ height: `${v > 0 ? Math.max(18, (v / max) * 100) : 12}%` }}
        />
      ))}
    </span>
  );
}

/** Tile body shared by every kind: icon + title, sub, state line, footer. */
function TileBody({
  icon,
  title,
  sub,
  state,
  footer,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: React.ReactNode;
  state: React.ReactNode;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col justify-between p-3 text-left">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-px shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[13px] leading-[18px] font-semibold text-foreground">
            <span className="truncate">{title}</span>
            {badge}
          </p>
          {sub ? <p className="truncate font-mono text-[11px] leading-4 text-faint">{sub}</p> : null}
        </div>
      </div>
      <div className="space-y-1">
        {state}
        {footer ? <div className="flex items-center justify-between gap-2 text-[11px] text-faint tabular-nums">{footer}</div> : null}
      </div>
    </div>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

export function agentState(stat: AgentStat | undefined): { tone: StateTone; text: string } {
  if (stat?.live) return { tone: "live", text: `${stat.live} running` };
  const r = stat?.lastRun;
  if (!r) return { tone: "idle", text: "No runs yet" };
  const when = relativeTime(r.createdAt);
  if (r.status === "pending_approval") return { tone: "warn", text: `Awaiting approval · ${when}` };
  if (r.status === "dead") return { tone: "error", text: `Dead-lettered · ${when}` };
  if (r.status === "rejected") return { tone: "error", text: `Rejected · ${when}` };
  return { tone: "ok", text: `Succeeded · ${when}` };
}

export function AgentTile({ entry, stat }: { entry: CatalogEntry; stat: AgentStat | undefined }) {
  const Cat = categoryOf(entry.category).icon;
  const state = agentState(stat);
  return (
    <TileBody
      icon={<Cat className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      title={entry.name}
      badge={entry.riskTier === "high" ? <StampIcon className="size-3 shrink-0 text-warning" aria-label="Human approval" /> : entry.toolsEnabled ? <PlugZapIcon className="size-3 shrink-0 text-brand" aria-label="Tool-ready" /> : null}
      state={<StateLine tone={state.tone}>{state.text}</StateLine>}
      footer={
        <>
          <span className="truncate">{stat?.runs ? `${compactNumber(stat.runs)} runs · ${usd(stat.billedUsd)}` : "—"}</span>
          {stat?.spark.length ? <Spark values={stat.spark} /> : null}
        </>
      }
    />
  );
}

export function AppTile({ data }: { data: CanvasData }) {
  const active = (data.keys.data?.keys ?? []).filter((k) => !k.revokedAt);
  const lastUsed = active.map((k) => k.lastUsedAt).filter(Boolean).sort((a, b) => +b! - +a!)[0];
  const noKey = data.keys.isSuccess && active.length === 0;
  return (
    <TileBody
      icon={<ServerIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      title="Your backend"
      sub={active.length ? `${active.length} active API key${active.length === 1 ? "" : "s"}` : "no API key"}
      state={
        noKey ? (
          <StateLine tone="error">Create an API key to connect</StateLine>
        ) : lastUsed ? (
          <StateLine tone="ok">Last request {relativeTime(lastUsed)}</StateLine>
        ) : (
          <StateLine tone="idle">No requests yet</StateLine>
        )
      }
    />
  );
}

export function ApiTile({ data }: { data: CanvasData }) {
  const status = data.setup.data?.status;
  const u = data.usageNow.data;
  const pct = u?.monthlyBudgetUsd ? u.billedUsd / u.monthlyBudgetUsd : null;
  return (
    <TileBody
      icon={<BrandMark size={16} />}
      title="Succor API"
      sub={data.setup.data ? hostOf(data.setup.data.serviceUrl) : " "}
      state={
        status === "approved" ? (
          <StateLine tone="ok">Accepting requests</StateLine>
        ) : status ? (
          <StateLine tone={status === "pending" ? "warn" : "error"}>Project {status}: calls return 403</StateLine>
        ) : (
          <StateLine tone="idle">Loading</StateLine>
        )
      }
      footer={
        pct !== null ? (
          <span className="flex w-full items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
              <span
                className={cn("block h-full rounded-full", pct >= 1 ? "bg-error" : pct >= 0.8 ? "bg-warning" : "bg-brand")}
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </span>
            <span>{percent(pct, 0)} of budget</span>
          </span>
        ) : (
          <span>No monthly cap</span>
        )
      }
    />
  );
}

export function ReviewTile({ data }: { data: CanvasData }) {
  const gated = data.agents.filter((a) => a.riskTier === "high");
  return (
    <TileBody
      icon={<StampIcon className="size-4 text-warning" strokeWidth={1.75} />}
      title="Human review"
      sub={gated.map((g) => g.agentType).join(", ")}
      state={
        data.waiting ? (
          <StateLine tone="warn">
            {data.waiting} waiting for a decision
          </StateLine>
        ) : (
          <StateLine tone="ok">Nothing waiting</StateLine>
        )
      }
    />
  );
}

export function DeliveryTile({ data }: { data: CanvasData }) {
  const d = data.summary.data?.deliveries;
  const delivered = d?.byStatus["succeeded"] ?? 0;
  const retrying = d?.byStatus["ready"] ?? 0;
  return (
    <TileBody
      icon={<SendIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      title="Delivery"
      sub="3 attempts · signed"
      state={
        data.lost ? (
          <StateLine tone="error">{data.lost} undeliverable</StateLine>
        ) : retrying ? (
          <StateLine tone="live">{retrying} retrying or queued</StateLine>
        ) : delivered ? (
          <StateLine tone="ok">All delivered</StateLine>
        ) : (
          <StateLine tone="idle">Nothing sent in this window</StateLine>
        )
      }
      footer={<span>{compactNumber(delivered)} delivered</span>}
    />
  );
}

export function EndpointTile({ stat }: { stat: EndpointStat | null }) {
  if (!stat) {
    return (
      <TileBody
        icon={<CircleDashedIcon className="size-4 text-faint" strokeWidth={1.75} />}
        title="No callback URL"
        sub="results have nowhere to go"
        state={<StateLine tone="error">Add one in Settings</StateLine>}
      />
    );
  }
  const rate = stat.attempts ? stat.ok / stat.attempts : null;
  return (
    <TileBody
      icon={<GlobeIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      title={stat.label}
      sub={hostOf(stat.url)}
      state={
        rate === null ? (
          <StateLine tone="idle">No deliveries recorded</StateLine>
        ) : stat.last && !stat.last.ok ? (
          <StateLine tone="error">Last attempt {stat.last.responseStatus ?? "no response"}</StateLine>
        ) : (
          <StateLine tone="ok">Last delivered {relativeTime(stat.last?.ts)}</StateLine>
        )
      }
      footer={rate === null ? undefined : <span>{percent(rate, 0)} of last {stat.attempts}</span>}
    />
  );
}

export function McpTile({ server, grants }: { server: McpServer; grants: number }) {
  return (
    <TileBody
      icon={<PlugZapIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      title={server.name}
      sub={hostOf(server.url)}
      state={
        server.enabled ? (
          <StateLine tone={grants ? "ok" : "idle"}>{grants ? `${grants} tool${grants === 1 ? "" : "s"} granted` : "No tools granted"}</StateLine>
        ) : (
          <StateLine tone="idle">Disabled</StateLine>
        )
      }
    />
  );
}

export function WorkflowsTile({ data }: { data: CanvasData }) {
  const running = data.workflowList.filter((w) => w.status === "running").length;
  const failed = data.workflowList.filter((w) => w.status === "failed").length;
  return (
    <TileBody
      icon={<WorkflowIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      title="Workflows"
      sub={`${data.workflowList.length} recent`}
      state={
        failed ? (
          <StateLine tone="error">{failed} failed</StateLine>
        ) : running ? (
          <StateLine tone="live">{running} running</StateLine>
        ) : (
          <StateLine tone="ok">All settled</StateLine>
        )
      }
    />
  );
}

export { TriangleAlertIcon };
