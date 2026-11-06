"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { useSetProjectAgents, useUpdateAdminProject } from "@/features/admin/hooks";
import { useCatalog } from "@/features/projects/hooks";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** A project as the admin projects endpoint returns it (loosely typed upstream). */
export interface AdminProjectRow {
  projectId?: string;
  name?: string;
  status?: string;
  orgId?: string | null;
  enabledAgents?: string[] | null;
  markupMultiplier?: number | null;
  monthlyBudgetUsd?: number | null;
  currentMonthUsage?: { runs?: number; billedUsd?: number; costUsd?: number } | null;
  createdAt?: string;
}

/** Markup, budget cap and agent enablement for one project (platform admin). */
export function ProjectConfigPanel({ project }: { project: AdminProjectRow }) {
  const catalog = useCatalog();
  const setAgents = useSetProjectAgents();
  const updateProject = useUpdateAdminProject();

  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [allAgents, setAllAgents] = useState(false);
  const [markup, setMarkup] = useState("");
  const [budget, setBudget] = useState("");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  // Initialize local state once per opened project (no effect needed).
  if (project.projectId && initializedFor !== project.projectId) {
    setInitializedFor(project.projectId);
    setAllAgents(project.enabledAgents == null);
    setEnabled(new Set(project.enabledAgents ?? []));
    setMarkup(project.markupMultiplier != null ? String(project.markupMultiplier) : "");
    setBudget(project.monthlyBudgetUsd != null ? String(project.monthlyBudgetUsd) : "");
  }

  function save() {
    if (!project.projectId) return;
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
      .then(() => toast.success("Project configuration saved"))
      .catch((err: unknown) =>
        toast.error(err instanceof ApiError ? err.message : "Save failed"),
      );
  }

  const saving = setAgents.isPending || updateProject.isPending;

  return (
    <div className="space-y-5 tile p-5">
      <div>
        <p className="text-sm font-semibold text-foreground">Configuration</p>
        <p className="text-sm text-muted-foreground">Markup, budget cap, and which agents this project may run.</p>
      </div>

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
            <div className="grid max-h-80 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
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

        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2Icon className="animate-spin" /> : null}
          Save configuration
        </Button>
    </div>
  );
}

