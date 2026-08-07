"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusIcon, FolderKanbanIcon, Loader2Icon } from "lucide-react";

import { useOrgCtx, RoleGate } from "@/features/orgs/org-context";
import { useOrgProjects, useCreateProject } from "@/features/orgs/hooks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { SecretReveal } from "@/components/secret-reveal";
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

const SLUG = /^[a-z0-9-]+$/;

function slugify(v: string): string {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const NewProjectSchema = z.object({
  name: z.string().min(1, "Give your project a name"),
  projectId: z.string().min(1, "Required").regex(SLUG, "Lowercase letters, numbers, and hyphens only"),
  apiBaseUrl: z.string().url("Enter the full URL, including https://"),
});
type NewProjectValues = z.infer<typeof NewProjectSchema>;

function NewProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (callbackKey: string) => void;
}) {
  const { org } = useOrgCtx();
  const createProject = useCreateProject(org.orgId);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<NewProjectValues>({
    resolver: zodResolver(NewProjectSchema),
    defaultValues: { name: "", projectId: "", apiBaseUrl: "" },
  });

  const serverError = createProject.error instanceof ApiError ? createProject.error.message : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Each project gets its own API keys, budget cap, and invoice.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            createProject.mutate(
              {
                projectId: v.projectId,
                name: v.name,
                apiBaseUrls: [{ label: "production", url: v.apiBaseUrl }],
              },
              {
                onSuccess: (r) => {
                  reset();
                  onOpenChange(false);
                  onCreated(r.agentApiKey);
                },
              },
            ),
          )}
        >
          {serverError ? (
            <p className="rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{serverError}</p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="np-name">Project name</Label>
            <Input
              id="np-name"
              aria-invalid={!!errors.name}
              {...register("name", {
                onChange: (e) => {
                  if (!dirtyFields.projectId) setValue("projectId", slugify(e.target.value));
                },
              })}
            />
            {errors.name ? <p className="text-xs text-error">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-id">Project ID</Label>
            <Input id="np-id" className="font-mono" aria-invalid={!!errors.projectId} {...register("projectId")} />
            {errors.projectId ? <p className="text-xs text-error">{errors.projectId.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-url">Your API base URL</Label>
            <Input
              id="np-url"
              type="url"
              placeholder="https://yourapp.com"
              aria-invalid={!!errors.apiBaseUrl}
              {...register("apiBaseUrl")}
            />
            {errors.apiBaseUrl ? (
              <p className="text-xs text-error">{errors.apiBaseUrl.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={createProject.isPending}>
            {createProject.isPending ? <Loader2Icon className="animate-spin" /> : null}
            Create project
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectsInner() {
  const { org, can } = useOrgCtx();
  const params = useSearchParams();
  const projects = useOrgProjects(org.orgId);
  const [dialogOpen, setDialogOpen] = useState(params.get("new") === "1" && can("project.create"));
  const [callbackKey, setCallbackKey] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Each project is separately keyed, capped, and invoiced."
        action={
          can("project.create") ? (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <PlusIcon />
              New project
            </Button>
          ) : undefined
        }
      />

      {projects.isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : !projects.data || projects.data.projects.length === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="No projects yet"
          description="Create a project to get API keys and start running agents."
          action={
            can("project.create") ? (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <PlusIcon />
                Create project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget cap</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.data.projects.map((p) => (
                <TableRow key={p.projectId}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{p.projectId}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        (["approved", "pending", "suspended"].includes(p.status ?? "")
                          ? p.status
                          : "draft") as Status
                      }
                    />
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {p.monthlyBudgetUsd != null ? `$${p.monthlyBudgetUsd}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/o/${org.orgId}/p/${p.projectId}`}>Open</Link>}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RoleGate min="admin">
        <NewProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={setCallbackKey}
        />
      </RoleGate>

      {callbackKey ? (
        <SecretReveal
          open={!!callbackKey}
          onOpenChange={(open) => {
            if (!open) setCallbackKey(null);
          }}
          secret={callbackKey}
          label="callback key"
          prefix="cbk_"
        />
      ) : null}
    </div>
  );
}

export default function OrgProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
