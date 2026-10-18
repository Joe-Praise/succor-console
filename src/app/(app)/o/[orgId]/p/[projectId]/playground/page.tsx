"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FlaskConicalIcon,
  PlayIcon,
  Loader2Icon,
  ChevronDownIcon,
  ShieldIcon,
  WebhookIcon,
  ReceiptTextIcon,
} from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import {
  useCatalog,
  usePlaygroundRuns,
  usePlaygroundRun,
  useStartPlaygroundRun,
} from "@/features/projects/hooks";
import { CapabilityBadges } from "@/features/agents/capability-badges";
import { PageHeader } from "@/components/page-header";
import { JsonPanel } from "@/components/json-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/types";

interface RunRow {
  _id?: string;
  agentType?: string;
  status?: string;
  createdAt?: string;
  requestedBy?: string;
}

/** agent-service PlaygroundRun (decoded) — output + captured callbacks + diagnostics. */
interface RunDoc {
  status?: string;
  output?: unknown;
  capturedCallbacks?: Array<{ method?: string; path?: string; url?: string; body?: unknown }> | null;
  errorMessage?: string | null;
  durationMs?: number | null;
  outputUndecodable?: boolean;
}

/** The example body, minus the fields the playground injects server-side. */
function exampleBody(entry: CatalogEntry) {
  const rest: Record<string, unknown> = { ...entry.requestExample };
  delete rest.projectId;
  delete rest.initiatedBy;
  return JSON.stringify(rest, null, 2);
}

const LIVE = new Set(["queued", "running"]);

function ResultView({ run }: { run: RunDoc }) {
  const [tab, setTab] = useState<"output" | "callbacks" | "raw">("output");
  const captures = run.capturedCallbacks ?? [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="callbacks">Callbacks ({captures.length})</TabsTrigger>
            <TabsTrigger value="raw">Raw run</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-faint tabular-nums">
          {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : ""}
        </span>
      </div>

      {run.errorMessage ? (
        <p className="rounded-lg bg-error-bg px-3 py-2 font-mono text-xs wrap-break-word text-error">{run.errorMessage}</p>
      ) : null}

      {tab === "output" ? (
        <JsonPanel
          value={run.output}
          label="output"
          empty={LIVE.has(run.status ?? "") ? "Running…" : "The agent returned no output."}
        />
      ) : tab === "callbacks" ? (
        captures.length === 0 ? (
          <p className="rounded-lg border border-dashed border-strong px-4 py-6 text-center text-sm text-muted-foreground">
            {LIVE.has(run.status ?? "") ? "Waiting for the agent to deliver…" : "This run made no callback."}
          </p>
        ) : (
          <div className="space-y-3">
            {captures.map((c, i) => (
              <JsonPanel
                key={i}
                value={c.body}
                label={`${c.method ?? "PUT"} ${c.path ?? c.url ?? ""} — captured, not sent`}
              />
            ))}
          </div>
        )
      ) : (
        <JsonPanel value={run} label="run" />
      )}
    </div>
  );
}

function Playground() {
  const { projectId } = useProjectScope();
  const params = useSearchParams();
  const catalog = useCatalog(projectId);
  const runs = usePlaygroundRuns(projectId);
  const start = useStartPlaygroundRun(projectId);

  const [agentType, setAgentType] = useState<string | null>(() => params.get("agent") || null);
  const [body, setBody] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const activeRun = usePlaygroundRun(projectId, activeRunId);

  const enabled = catalog.data?.catalog.filter((e) => e.enabledForProject !== false) ?? [];
  const selected = enabled.find((e) => e.agentType === agentType) ?? null;
  // Until the user edits it, the body tracks the selected agent's example.
  const text = body ?? (selected ? exampleBody(selected) : "{}");

  function run() {
    if (!agentType) {
      toast.error("Pick an agent first");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      toast.error("The request body isn't valid JSON");
      return;
    }
    start.mutate(
      { agentType, body: parsed },
      {
        onSuccess: (r) => {
          setActiveRunId(r.runId);
          toast.success("Run queued");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Run failed to start"),
      },
    );
  }

  const runRows = (runs.data?.runs ?? []) as RunRow[];
  const active = activeRun.data?.run as RunDoc | undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Playground"
        description="Run any enabled agent from the browser with the same guard chain as production."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: WebhookIcon, t: "Callbacks are captured", d: "Shown here instead of hitting your API." },
          { icon: ShieldIcon, t: "No tools, no side effects", d: "MCP tools only run inside durable jobs." },
          { icon: ReceiptTextIcon, t: "Metered like production", d: "Same budget cap, same per-run price." },
        ].map((x) => (
          <div key={x.t} className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
            <x.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">{x.t}</p>
              <p className="text-xs text-muted-foreground">{x.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compose a run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Agent</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate font-mono text-xs">{agentType ?? "Select an agent"}</span>
                      <ChevronDownIcon className="text-faint" />
                    </Button>
                  }
                />
                <DropdownMenuContent className="max-h-72 w-(--anchor-width) overflow-y-auto">
                  {enabled.map((e) => (
                    <DropdownMenuItem
                      key={e.agentType}
                      onClick={() => {
                        setAgentType(e.agentType);
                        setBody(null);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{e.agentType}</span>
                        <span className="text-xs text-muted-foreground">{e.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selected ? <CapabilityBadges entry={selected} className="pt-1" /> : null}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pg-body">Request body (JSON)</Label>
                <Button variant="ghost" size="xs" onClick={() => setBody(null)} disabled={!selected || body === null}>
                  Reset to example
                </Button>
              </div>
              <Textarea
                id="pg-body"
                rows={14}
                value={text}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs"
                spellCheck={false}
              />
              <p className="text-xs text-faint">
                <span className="font-mono">projectId</span> and <span className="font-mono">initiatedBy</span> are
                set by the server.
              </p>
            </div>

            <Button className="w-full" onClick={run} disabled={start.isPending}>
              {start.isPending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
              Run agent
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Result</CardTitle>
                <CardDescription>
                  {activeRunId ? "Polling every 2s until the run settles." : "Start a run to see its output and captured callbacks."}
                </CardDescription>
              </div>
              {active?.status ? <AnyStatusBadge value={active.status} /> : null}
            </div>
          </CardHeader>
          <CardContent>
            {activeRunId ? (
              active ? (
                <ResultView key={activeRunId} run={active} />
              ) : (
                <Skeleton className="h-40 w-full rounded-lg" />
              )
            ) : (
              <EmptyState
                icon={FlaskConicalIcon}
                title="Nothing yet"
                description="The output, the callback it would have sent, and the full run record land here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-faint">Recent runs</h2>
        {runRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No playground runs yet.</p>
        ) : (
          <div className="space-y-2">
            {runRows.map((r, i) => (
              <button
                key={r._id ?? i}
                type="button"
                onClick={() => r._id && setActiveRunId(r._id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-2.5 text-left transition-colors hover:border-strong",
                  r._id === activeRunId ? "border-brand" : "border-border",
                )}
              >
                <span className="font-mono text-xs">{r.agentType}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                  </span>
                  <AnyStatusBadge value={r.status} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PlaygroundPage() {
  // useSearchParams (the ?agent= preselect) needs a Suspense boundary in Next 16.
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <Playground />
    </Suspense>
  );
}
