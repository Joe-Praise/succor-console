"use client";

import { useParams } from "next/navigation";

import { useOrgCtx } from "@/features/orgs/org-context";
import type { ProjectRef } from "@/types";

/** The active /o/[orgId]/p/[projectId] scope. Use inside project pages only. */
export function useProjectScope(): {
  orgId: string;
  projectId: string;
  project: ProjectRef | null;
} {
  const params = useParams<{ orgId: string; projectId: string }>();
  const { org } = useOrgCtx();
  const projectId = params.projectId;
  return {
    orgId: org.orgId,
    projectId,
    project: org.projects.find((p) => p.projectId === projectId) ?? null,
  };
}
