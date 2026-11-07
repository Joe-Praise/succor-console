"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCatalog, useProjectSetup } from "@/features/projects/hooks";
import { useOrgProjects } from "@/features/orgs/hooks";
import { DocsShell } from "@/features/docs/shell";
import type { DocsEnv } from "@/features/docs/context";

/** The docs, filled in with this project's real URL, id, agents and callback address. */
export default function ProjectDocsPage() {
  const { orgId, projectId } = useProjectScope();
  const params = useParams<{ slug?: string[] }>();
  const setup = useProjectSetup(projectId);
  const catalog = useCatalog(projectId);
  const projects = useOrgProjects(orgId);
  const base = `/o/${orgId}/p/${projectId}`;
  const slug = (params.slug ?? []).join("/");

  const project = projects.data?.projects.find((p) => p.projectId === projectId);
  const env: DocsEnv = useMemo(() => {
    const urls = project?.apiBaseUrls ?? [];
    const primary = urls.find((u) => u.label === "production") ?? urls[0];
    return {
      scoped: true,
      serviceUrl: setup.data?.serviceUrl ?? "$SUCCOR_API_URL",
      projectId,
      agents: (catalog.data?.catalog ?? []).filter((e) => e.enabledForProject),
      status: setup.data?.status ?? null,
      callbackBaseUrl: primary?.url.replace(/\/+$/, "") ?? "https://your-api.example.com",
      docHref: (s) => (s ? `${base}/docs/${s}` : `${base}/docs`),
      appHref: (path) => `${base}${path}`,
    };
  }, [setup.data, catalog.data, project, projectId, base]);

  return <DocsShell env={env} slug={slug} stickyClass="sticky top-0 self-start pt-8" />;
}
