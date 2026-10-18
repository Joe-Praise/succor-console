"use client";

import { useMemo } from "react";

import { useCatalog } from "@/features/projects/hooks";

/** agentType → display name from the (cached) catalog; falls back to the slug. */
export function useAgentNames(projectId?: string) {
  const catalog = useCatalog(projectId);
  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of catalog.data?.catalog ?? []) m.set(e.agentType, e.name);
    return m;
  }, [catalog.data]);
  return {
    nameOf: (agentType: string) => names.get(agentType) ?? agentType,
    entries: catalog.data?.catalog ?? [],
    catalog,
  };
}
