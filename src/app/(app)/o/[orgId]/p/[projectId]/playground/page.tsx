"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FlaskConicalIcon, PlayIcon, Loader2Icon, ChevronDownIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import {
  useCatalog,
  usePlaygroundRuns,
  usePlaygroundRun,
  useStartPlaygroundRun,
} from "@/features/projects/hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

interface RunRow {
  _id?: string;
  agentType?: string;
  status?: string;
  createdAt?: string;
  requestedBy?: string;
}

export default function PlaygroundPage() {
  const { projectId } = useProjectScope();
  const catalog = useCatalog(projectId);
  const runs = usePlaygroundRuns(projectId);
  const start = useStartPlaygroundRun(projectId);

  const [agentType, setAgentType] = useState<string | null>(null);
  const [body, setBody] = useState("{}");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const activeRun = usePlaygroundRun(projectId, activeRunId);

  const enabled = catalog.data?.catalog.filter((e) => e.enabledForProject !== false) ?? [];
  const selected = enabled.find((e) => e.agentType === agentType) ?? null;

  function loadExample() {
    if (!selected) return;
    // Strip server-injected fields — the playground sets them itself.
    const { projectId: _p, initiatedBy: _i, ...rest } = selected.requestExample;
    setBody(JSON.stringify(rest, null, 2));
  }

  function run() {
    if (!agentType) {
      toast.error("Pick an agent first");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
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
  const activeStatus = (activeRun.data?.run as { status?: string } | undefined)?.status;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Playground"
        description="Run any enabled agent from the browser — callbacks are captured here instead of hitting your API. Runs are metered like production."
      />

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
                      <span className="truncate font-mono text-xs">
                        {agentType ?? "Select an agent"}
                      </span>
                      <ChevronDownIcon className="text-faint" />
                    </Button>
                  }
                />
                <DropdownMenuContent className="max-h-72 w-(--anchor-width) overflow-y-auto">
                  {enabled.map((e) => (
                    <DropdownMenuItem key={e.agentType} onClick={() => setAgentType(e.agentType)}>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{e.agentType}</span>
                        <span className="text-xs text-muted-foreground">{e.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pg-body">Request body (JSON)</Label>
                <Button variant="ghost" size="xs" onClick={loadExample} disabled={!selected}>
                  Load example
                </Button>
              </div>
              <Textarea
                id="pg-body"
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs"
                spellCheck={false}
              />
            </div>

            <Button className="w-full" onClick={run} disabled={start.isPending}>
              {start.isPending ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
              Run agent
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>
              {activeRunId
                ? activeStatus === "queued" || activeStatus === "running"
                  ? "Running…"
                  : `Status: ${activeStatus ?? "unknown"}`
                : "Start a run to see its output and captured callbacks."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeRunId ? (
              activeRun.data ? (
                <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                  {JSON.stringify(activeRun.data.run, null, 2)}
                </pre>
              ) : (
                <Skeleton className="h-40 w-full rounded-lg" />
              )
            ) : (
              <EmptyState
                icon={FlaskConicalIcon}
                title="Nothing yet"
                description="The full run record — output, tokens, captured callbacks — lands here."
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
                    {r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ""}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      r.status === "success"
                        ? "text-success"
                        : r.status === "queued" || r.status === "running"
                          ? "text-info"
                          : "text-error",
                    )}
                  >
                    {r.status}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
