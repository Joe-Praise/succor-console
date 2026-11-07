"use client";

import Link from "next/link";
import { ArrowRightIcon, FlaskConicalIcon, XIcon } from "lucide-react";

import { useCallbacks } from "@/features/projects/hooks";
import { useRuns } from "@/features/executions/hooks";
import { CapabilityBadges } from "@/features/agents/capability-badges";
import { parseEndpoint } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { compactNumber, duration, percent, relativeTime, shortId, usd } from "@/lib/format";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { DeliveryBadge, ToneDot } from "@/components/ops/primitives";
import { toneOf } from "@/lib/status";
import { agentState, StateLine } from "@/features/canvas/tiles";
import type { CanvasData } from "@/features/canvas/use-canvas-data";

function PanelSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline px-4 py-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="kicker">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 flex-1 px-3 py-2.5 first:pl-4">
      <p className="truncate text-[11px] text-faint">{label}</p>
      <p className={cn("mt-0.5 truncate text-[15px] font-semibold tracking-tight tabular-nums", tone ?? "text-foreground")}>{value}</p>
    </div>
  );
}

function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex divide-x divide-hairline border-t border-hairline">{children}</div>;
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
      {children}
      <ArrowRightIcon className="size-3" />
    </Link>
  );
}

function RunList({ projectId, base, agentType }: { projectId: string; base: string; agentType?: string }) {
  const runs = useRuns(projectId, { agentType, limit: 6 });
  const rows = runs.data?.pages[0]?.jobs ?? [];
  if (runs.isLoading) return <Skeleton className="h-24" />;
  if (rows.length === 0) return <p className="text-[13px] text-muted-foreground">Nothing has run yet.</p>;
  return (
    <ul className="-mx-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`${base}/runs/${r.id}`} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-raised">
            <ToneDot tone={toneOf(r.status)} className={r.status === "running" ? "live-dot" : undefined} />
            <span className="font-mono text-[11px] text-foreground">{shortId(r.id)}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.status.replace(/_/g, " ")}</span>
            <span className="text-[11px] text-faint tabular-nums">{relativeTime(r.createdAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DeliveryList({ projectId, base, label }: { projectId: string; base: string; label?: string }) {
  const callbacks = useCallbacks(projectId, 50);
  const rows = (callbacks.data?.deliveries ?? []).filter((d) => !label || d.envLabel === label).slice(0, 6);
  if (callbacks.isLoading) return <Skeleton className="h-24" />;
  if (rows.length === 0) return <p className="text-[13px] text-muted-foreground">No delivery attempts recorded (they&apos;re kept for 30 days).</p>;
  return (
    <ul className="-mx-2">
      {rows.map((d) => {
        const id = d.id ?? d._id ?? "";
        const path = (() => {
          try {
            return new URL(d.url).pathname;
          } catch {
            return d.url;
          }
        })();
        return (
          <li key={id}>
            <Link href={`${base}/callbacks/${id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-raised">
              <span className={cn("w-8 shrink-0 font-mono text-[11px] tabular-nums", d.ok ? "text-success" : "text-error")}>{d.responseStatus ?? "—"}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                {d.method} {path}
              </span>
              <span className="text-[11px] text-faint tabular-nums">{relativeTime(d.ts)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AgentPanel({ data, agentType, base, projectId }: { data: CanvasData; agentType: string; base: string; projectId: string }) {
  const entry = data.agents.find((a) => a.agentType === agentType);
  if (!entry) return <p className="p-4 text-[13px] text-muted-foreground">This agent isn&apos;t enabled for the project.</p>;
  const stat = data.agentStats.get(agentType);
  const state = agentState(stat);
  const { method, path } = parseEndpoint(entry.endpoint);
  return (
    <>
      <div className="px-4 pb-3">
        <StateLine tone={state.tone}>{state.text}</StateLine>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{entry.description}</p>
        <CapabilityBadges entry={entry} className="mt-2.5" />
      </div>
      <StatRow>
        <Stat label="Runs" value={stat?.runs ? compactNumber(stat.runs) : "0"} />
        <Stat label="Billed" value={usd(stat?.billedUsd ?? 0)} />
        <Stat label="Live now" value={String(stat?.live ?? 0)} tone={stat?.live ? "text-info" : undefined} />
      </StatRow>
      <PanelSection title="The contract">
        <div className="space-y-1 font-mono text-[11px]">
          <p className="flex gap-2">
            <span className="w-7 shrink-0 text-faint">in</span>
            <span className="min-w-0 truncate text-foreground">
              {method} {path}
            </span>
          </p>
          <p className="flex gap-2">
            <span className="w-7 shrink-0 text-faint">out</span>
            <span className="min-w-0 truncate text-foreground">
              {entry.callbackMethod} {"<base URL>"}
              {entry.callbackPath}
            </span>
          </p>
        </div>
      </PanelSection>
      <PanelSection title="Recent runs" action={<PanelLink href={`${base}/runs?agent=${agentType}`}>All runs</PanelLink>}>
        <RunList projectId={projectId} base={base} agentType={agentType} />
      </PanelSection>
      <div className="flex gap-2 border-t border-hairline p-4">
        <Button size="sm" render={<Link href={`${base}/playground?agent=${agentType}`} />}>
          <FlaskConicalIcon />
          Try in playground
        </Button>
        <Button size="sm" variant="outline" render={<Link href={`${base}/agents/${agentType}`} />}>
          Agent details
        </Button>
      </div>
    </>
  );
}

function AppPanel({ data, base }: { data: CanvasData; base: string }) {
  const envBlock = data.setup.data
    ? Object.entries(data.setup.data.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    : "";
  const keys = (data.keys.data?.keys ?? []).filter((k) => !k.revokedAt);
  return (
    <>
      <p className="px-4 pb-3 text-[13px] leading-relaxed text-muted-foreground">
        Your server calls agents with an API key. Keys belong on the server: never ship one to a browser.
      </p>
      <PanelSection title="Environment" action={<PanelLink href={`${base}/docs/quickstart`}>Quickstart</PanelLink>}>
        {data.setup.isLoading ? <Skeleton className="h-20" /> : <CodeBlock label=".env" code={envBlock} />}
      </PanelSection>
      <PanelSection title="Active API keys" action={<PanelLink href={`${base}/keys`}>Manage</PanelLink>}>
        {keys.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">None yet. Create one to start calling agents.</p>
        ) : (
          <ul className="-mx-2">
            {keys.map((k) => (
              <li key={k.id}>
                <Link href={`${base}/keys/${k.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-raised">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{k.name}</span>
                  <span className="font-mono text-[11px] text-faint">…{k.last4}</span>
                  <span className="text-[11px] text-faint tabular-nums">{k.lastUsedAt ? relativeTime(k.lastUsedAt) : "never used"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </>
  );
}

const GUARDS = [
  { code: "401", text: "Is the API key valid?" },
  { code: "403", text: "Does the key belong to this project?" },
  { code: "402", text: "Is the project under its monthly budget?" },
  { code: "403", text: "Is the project approved and the agent enabled?" },
  { code: "200", text: "Have we seen this requestId? Then it's a duplicate." },
  { code: "400", text: "Does the body match the agent's schema?" },
  { code: "202", text: "Accepted: saved as a durable job." },
];

function ApiPanel({ data, base }: { data: CanvasData; base: string }) {
  const u = data.usageNow.data;
  const s = data.summary.data;
  return (
    <>
      <StatRow>
        <Stat label="Runs" value={s ? compactNumber(s.runs.total) : "—"} />
        <Stat label="p50" value={duration(s?.durationMs.p50)} />
        <Stat label="p95" value={duration(s?.durationMs.p95)} />
      </StatRow>
      <PanelSection title="Monthly budget" action={<PanelLink href={`${base}/usage`}>Usage</PanelLink>}>
        {u ? <BudgetMeter spent={u.billedUsd} budget={u.monthlyBudgetUsd} /> : <Skeleton className="h-8" />}
      </PanelSection>
      <PanelSection title="Every request passes, in order" action={<PanelLink href={`${base}/docs/responses`}>Responses</PanelLink>}>
        <ol className="space-y-1.5">
          {GUARDS.map((g, i) => (
            <li key={i} className="flex items-baseline gap-2.5 text-xs">
              <span className={cn("w-7 shrink-0 font-mono text-[11px] tabular-nums", g.code === "202" ? "text-success" : "text-faint")}>{g.code}</span>
              <span className="text-muted-foreground">{g.text}</span>
            </li>
          ))}
        </ol>
      </PanelSection>
    </>
  );
}

function ReviewPanel({ data, base }: { data: CanvasData; base: string }) {
  const list = data.approvals.data?.approvals ?? [];
  return (
    <>
      <p className="px-4 pb-3 text-[13px] leading-relaxed text-muted-foreground">
        High-risk agents generate and validate, then hold their delivery. Nothing reaches your API until an admin approves it.
      </p>
      <PanelSection title={`Waiting (${list.length})`} action={<PanelLink href={`${base}/approvals`}>Review</PanelLink>}>
        {list.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nothing is waiting.</p>
        ) : (
          <ul className="-mx-2">
            {list.map((a) => (
              <li key={a.jobId}>
                <Link href={`${base}/approvals?job=${a.jobId}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-raised">
                  <span className="font-mono text-[11px] text-foreground">{shortId(a.jobId)}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                    {a.target ? `${a.target.method} ${a.target.path}` : a.agentType}
                  </span>
                  <span className="text-[11px] text-faint tabular-nums">{relativeTime(a.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </>
  );
}

function DeliveryPanel({ data, base, projectId }: { data: CanvasData; base: string; projectId: string }) {
  const d = data.summary.data?.deliveries;
  const by = d?.byStatus ?? {};
  return (
    <>
      <StatRow>
        <Stat label="Delivered" value={compactNumber(by["succeeded"] ?? 0)} />
        <Stat label="Undeliverable" value={compactNumber(data.lost)} tone={data.lost ? "text-error" : undefined} />
        <Stat label="Unknown" value={compactNumber(d?.outcomeUnknown ?? 0)} tone={d?.outcomeUnknown ? "text-warning" : undefined} />
      </StatRow>
      <PanelSection title="How delivery works" action={<PanelLink href={`${base}/docs/callbacks`}>Callbacks</PanelLink>}>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Up to 3 attempts with backoff. Your 5xx, 429 and timeouts retry; any other 4xx is final. Dedupe on{" "}
          <code className="font-mono text-xs text-foreground">X-Delivery-Id</code>: a timed-out attempt may still have arrived.
        </p>
      </PanelSection>
      <PanelSection title="Recent attempts" action={<PanelLink href={`${base}/callbacks`}>All</PanelLink>}>
        <DeliveryList projectId={projectId} base={base} />
      </PanelSection>
    </>
  );
}

function EndpointPanel({ data, label, base, projectId }: { data: CanvasData; label: string; base: string; projectId: string }) {
  const stat = data.endpointStats.find((e) => e.label === label);
  if (!stat) {
    return (
      <div className="px-4 pb-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Agents finish, but results have nowhere to land until you set a callback base URL.
        </p>
        <Button size="sm" className="mt-3" render={<Link href={`${base}/settings`} />}>
          Add a callback URL
        </Button>
      </div>
    );
  }
  return (
    <>
      <div className="px-4 pb-3">
        <p className="font-mono text-xs break-all text-foreground">{stat.url}</p>
      </div>
      <StatRow>
        <Stat label="Attempts" value={String(stat.attempts)} />
        <Stat label="Landed" value={stat.attempts ? percent(stat.ok / stat.attempts, 0) : "—"} />
      </StatRow>
      <PanelSection title="Recent attempts" action={<PanelLink href={`${base}/settings`}>Settings</PanelLink>}>
        <DeliveryList projectId={projectId} base={base} label={label} />
      </PanelSection>
    </>
  );
}

function McpPanel({ data, serverId, base }: { data: CanvasData; serverId: string; base: string }) {
  const server = data.serverList.find((s) => s.id === serverId);
  if (!server) return null;
  const grants = data.activeGrants.filter((g) => g.serverId === serverId);
  return (
    <>
      <div className="px-4 pb-3">
        <p className="font-mono text-xs break-all text-foreground">{server.url}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A tool reaches the model only if the agent was built for tools and you granted it. Only read-only tools execute.
        </p>
      </div>
      <PanelSection title={`Granted tools (${grants.length})`} action={<PanelLink href={`${base}/tools/servers/${server.id}`}>Server</PanelLink>}>
        {grants.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No tools granted to any agent.</p>
        ) : (
          <ul className="-mx-2">
            {grants.map((g) => (
              <li key={g.id}>
                <Link href={`${base}/tools/grants/${g.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-raised">
                  <span className="font-mono text-[11px] text-foreground">{g.toolName}</span>
                  <span className="min-w-0 flex-1 truncate text-right font-mono text-[11px] text-faint">{g.agentType}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </>
  );
}

function WorkflowsPanel({ data, base }: { data: CanvasData; base: string }) {
  return (
    <PanelSection title="Recent workflows" action={<PanelLink href={`${base}/workflows`}>All</PanelLink>}>
      <ul className="-mx-2">
        {data.workflowList.slice(0, 8).map((w) => (
          <li key={w.id}>
            <Link href={`${base}/workflows/${w.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-raised">
              <AnyStatusBadge value={w.status} />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">{w.workflowType}</span>
              <span className="text-[11px] text-faint tabular-nums">{relativeTime(w.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function titleFor(id: string, data: CanvasData): { kicker: string; title: string } {
  if (id.startsWith("agent:")) {
    const a = data.agents.find((x) => x.agentType === id.slice(6));
    return { kicker: "Agent", title: a?.name ?? id.slice(6) };
  }
  if (id.startsWith("endpoint:")) return { kicker: "Callback endpoint", title: id.slice(9) === "none" ? "No callback URL" : id.slice(9) };
  if (id.startsWith("mcp:")) return { kicker: "MCP server", title: data.serverList.find((s) => s.id === id.slice(4))?.name ?? "Server" };
  const fixed: Record<string, { kicker: string; title: string }> = {
    app: { kicker: "Source", title: "Your backend" },
    api: { kicker: "Entry point", title: "Succor API" },
    review: { kicker: "Human in the loop", title: "Human review" },
    delivery: { kicker: "Delivery engine", title: "Delivery" },
    workflows: { kicker: "Orchestration", title: "Workflows" },
  };
  return fixed[id] ?? { kicker: "", title: id };
}

/** The panel a selected tile opens. Everything in it is a real read; every list links on. */
export function Inspector({
  id,
  data,
  base,
  projectId,
  onClose,
}: {
  id: string;
  data: CanvasData;
  base: string;
  projectId: string;
  onClose: () => void;
}) {
  const { kicker, title } = titleFor(id, data);
  let body: React.ReactNode = null;
  if (id.startsWith("agent:")) body = <AgentPanel data={data} agentType={id.slice(6)} base={base} projectId={projectId} />;
  else if (id.startsWith("endpoint:")) body = <EndpointPanel data={data} label={id.slice(9)} base={base} projectId={projectId} />;
  else if (id.startsWith("mcp:")) body = <McpPanel data={data} serverId={id.slice(4)} base={base} />;
  else if (id === "app") body = <AppPanel data={data} base={base} />;
  else if (id === "api") body = <ApiPanel data={data} base={base} />;
  else if (id === "review") body = <ReviewPanel data={data} base={base} />;
  else if (id === "delivery") body = <DeliveryPanel data={data} base={base} projectId={projectId} />;
  else if (id === "workflows") body = <WorkflowsPanel data={data} base={base} />;

  return (
    <aside
      data-canvas-ui
      aria-label={title}
      className="slide-in-right absolute inset-y-2 right-2 z-30 flex w-[min(420px,calc(100%-16px))] flex-col overflow-hidden tile shadow-xl"
    >
      <header className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2.5">
        <div className="min-w-0">
          <p className="kicker">{kicker}</p>
          <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close panel" onClick={onClose}>
          <XIcon />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </aside>
  );
}

export { DeliveryBadge };
