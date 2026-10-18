"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { useAdminProjects, useApproveProject, useSuspendProject } from "@/features/admin/hooks";
import { ProjectConfigPanel, type AdminProjectRow } from "@/features/admin/project-config";
import { ApiError } from "@/api/client";
import { usd, dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { DetailPage, DetailNotFound, renderDetailState } from "@/components/ops/detail-page";

export default function AdminProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const projects = useAdminProjects();
  const approve = useApproveProject();
  const suspend = useSuspendProject();

  const state = renderDetailState({ query: projects, backHref: "/admin/projects", backLabel: "All projects", noun: "project" });
  if (state) return state;
  const p = ((projects.data?.projects ?? []) as AdminProjectRow[]).find((x) => x.projectId === projectId);
  if (!p) return <DetailNotFound backHref="/admin/projects" backLabel="All projects" noun="project" />;

  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "Action failed");

  return (
    <DetailPage
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Projects", href: "/admin/projects" }, { label: p.name ?? projectId }]}
      eyebrow="Project"
      title={p.name ?? projectId}
      id={projectId}
      status={<StatusBadge status={(p.status ?? "approved") as Status} />}
      actions={
        p.status !== "approved" ? (
          <Button
            size="sm"
            disabled={approve.isPending}
            onClick={() => approve.mutate(projectId, { onSuccess: () => toast.success("Project approved"), onError })}
          >
            Approve
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            disabled={suspend.isPending}
            onClick={() => {
              if (!window.confirm(`Suspend ${p.name}? Its agent calls are refused immediately.`)) return;
              suspend.mutate(projectId, { onSuccess: () => toast.success("Project suspended"), onError });
            }}
          >
            Suspend
          </Button>
        )
      }
      facts={[
        {
          label: "Organization",
          value: p.orgId ? (
            <Link href={`/admin/orgs/${p.orgId}`} className="font-mono text-xs text-brand hover:underline">
              {p.orgId}
            </Link>
          ) : (
            "— (legacy)"
          ),
        },
        { label: "Runs this month", value: (p.currentMonthUsage?.runs ?? 0).toLocaleString() },
        { label: "Billed this month", value: usd(p.currentMonthUsage?.billedUsd ?? 0) },
        { label: "Created", value: dateTime(p.createdAt) },
      ]}
      aside={
        <div className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Related</p>
          {p.orgId ? (
            <Link href={`/o/${p.orgId}/p/${projectId}`} className="block text-brand hover:underline">
              Open in the console
            </Link>
          ) : null}
          {p.orgId ? (
            <Link href={`/o/${p.orgId}/p/${projectId}/runs`} className="block text-brand hover:underline">
              Its runs
            </Link>
          ) : null}
          <Link href={`/admin/logs?project=${projectId}`} className="block text-brand hover:underline">
            Its run log
          </Link>
        </div>
      }
    >
      <ProjectConfigPanel project={p} />
    </DetailPage>
  );
}
