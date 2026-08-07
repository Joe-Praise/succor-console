"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FolderKanbanIcon, SlidersHorizontalIcon, Loader2Icon } from "lucide-react";

import {
  useAdminProjects,
  useApproveProject,
  useSuspendProject,
  useSetProjectAgents,
  useUpdateAdminProject,
} from "@/features/admin/hooks";
import { useCatalog } from "@/features/projects/hooks";
import { usd } from "@/features/invoices/invoice-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/api/client";

interface ProjectRow {
  projectId?: string;
  name?: string;
  status?: string;
  orgId?: string | null;
  enabledAgents?: string[] | null;
  markupMultiplier?: number | null;
  monthlyBudgetUsd?: number | null;
  currentMonthUsage?: { runs?: number; billedUsd?: number } | null;
}

function ConfigureDialog({
  project,
  open,
  onOpenChange,
}: {
  project: ProjectRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const catalog = useCatalog();
  const setAgents = useSetProjectAgents();
  const updateProject = useUpdateAdminProject();

  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [allAgents, setAllAgents] = useState(false);
  const [markup, setMarkup] = useState("");
  const [budget, setBudget] = useState("");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  // Initialize local state once per opened project (no effect needed).
  if (project?.projectId && initializedFor !== project.projectId && open) {
    setInitializedFor(project.projectId);
    setAllAgents(project.enabledAgents == null);
    setEnabled(new Set(project.enabledAgents ?? []));
    setMarkup(project.markupMultiplier != null ? String(project.markupMultiplier) : "");
    setBudget(project.monthlyBudgetUsd != null ? String(project.monthlyBudgetUsd) : "");
  }

  if (!project) return null;

  function save() {
    if (!project?.projectId) return;
    const projectId = project.projectId;
    const markupVal = markup.trim() === "" ? null : Number(markup);
    const budgetVal = budget.trim() === "" ? null : Number(budget);
    if (markupVal != null && (Number.isNaN(markupVal) || markupVal < 1)) {
      toast.error("Markup must be ≥ 1 (or blank for the global default)");
      return;
    }
    if (budgetVal != null && (Number.isNaN(budgetVal) || budgetVal < 0)) {
      toast.error("Budget must be ≥ 0 (or blank for uncapped)");
      return;
    }
    const agents = allAgents ? null : [...enabled];
    Promise.all([
      setAgents.mutateAsync({ projectId, enabledAgents: agents }),
      updateProject.mutateAsync({
        projectId,
        markupMultiplier: markupVal,
        monthlyBudgetUsd: budgetVal,
      }),
    ])
      .then(() => {
        toast.success("Project configuration saved");
        onOpenChange(false);
      })
      .catch((err: unknown) =>
        toast.error(err instanceof ApiError ? err.message : "Save failed"),
      );
  }

  const saving = setAgents.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure {project.name}</DialogTitle>
          <DialogDescription>
            Markup, budget cap, and which agents this project may run.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cfg-markup">Markup multiplier</Label>
            <Input
              id="cfg-markup"
              placeholder="global default"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-budget">Monthly budget (USD)</Label>
            <Input
              id="cfg-budget"
              placeholder="uncapped"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Enabled agents</Label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              All agents
              <Switch checked={allAgents} onCheckedChange={setAllAgents} />
            </label>
          </div>
          {!allAgents ? (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {(catalog.data?.catalog ?? []).map((e) => (
                <label
                  key={e.agentType}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-raised"
                >
                  <span className="font-mono text-xs">{e.agentType}</span>
                  <Switch
                    checked={enabled.has(e.agentType)}
                    onCheckedChange={(on) => {
                      setEnabled((prev) => {
                        const next = new Set(prev);
                        if (on) next.add(e.agentType);
                        else next.delete(e.agentType);
                        return next;
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-faint">Every catalog agent is allowed (legacy mode).</p>
          )}
        </div>

        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : null}
          Save configuration
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProjectsPage() {
  const projects = useAdminProjects();
  const approve = useApproveProject();
  const suspend = useSuspendProject();
  const [configuring, setConfiguring] = useState<ProjectRow | null>(null);

  const rows = (projects.data?.projects ?? []) as ProjectRow[];

  function onError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "Action failed");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Approve, suspend, and configure markup, caps, and agent enablement."
      />

      {projects.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="No projects"
          description="Projects appear here as organizations create them."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Org</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Billed (month)</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-right">Cap</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p, i) => (
                <TableRow key={p.projectId ?? i}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.projectId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.orgId ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={(p.status ?? "approved") as Status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {usd(p.currentMonthUsage?.billedUsd ?? 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.markupMultiplier != null ? `${p.markupMultiplier}×` : "default"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.monthlyBudgetUsd != null ? usd(p.monthlyBudgetUsd) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Configure"
                        onClick={() => setConfiguring(p)}
                      >
                        <SlidersHorizontalIcon />
                      </Button>
                      {p.status !== "approved" ? (
                        <Button
                          size="sm"
                          disabled={approve.isPending}
                          onClick={() =>
                            p.projectId &&
                            approve.mutate(p.projectId, {
                              onSuccess: () => toast.success(`${p.name} approved`),
                              onError,
                            })
                          }
                        >
                          Approve
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={suspend.isPending}
                          onClick={() =>
                            p.projectId &&
                            suspend.mutate(p.projectId, {
                              onSuccess: () => toast.success(`${p.name} suspended`),
                              onError,
                            })
                          }
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfigureDialog
        project={configuring}
        open={!!configuring}
        onOpenChange={(o) => {
          if (!o) setConfiguring(null);
        }}
      />
    </div>
  );
}
