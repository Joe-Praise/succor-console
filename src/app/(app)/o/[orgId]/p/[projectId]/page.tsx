"use client";

import { Suspense, useEffect, useState } from "react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCanvasData, type CanvasData } from "@/features/canvas/use-canvas-data";
import { CanvasSurface } from "@/features/canvas/surface";
import { Inspector } from "@/features/canvas/inspector";
import { ActivityDock, CreateMenu, GoLiveCard, HealthStrip } from "@/features/canvas/chrome";
import {
  AgentTile,
  ApiTile,
  AppTile,
  categoryOf,
  DeliveryTile,
  EndpointTile,
  McpTile,
  ReviewTile,
  WorkflowsTile,
} from "@/features/canvas/tiles";
import type { CanvasGroup, CanvasNode } from "@/features/canvas/graph";
import { useUrlFilters } from "@/lib/url-filters";
import { isRangeKey, rangeBounds, type RangeKey } from "@/lib/time-range";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const URL_KEYS = ["node", "range"] as const;

/** A tile that can be selected. Pointer clicks arrive through the surface; this handles keyboard. */
function TileButton({
  id,
  selected,
  onSelect,
  className,
  children,
}: {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-select-id={id}
      aria-pressed={selected}
      onClick={(e) => {
        if (e.detail === 0) onSelect(id);
      }}
      className={cn(
        "tile tile-link block size-full outline-none focus-visible:border-brand",
        selected && "border-brand! ring-1 ring-brand/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function GroupFrame({
  group,
  data,
  selectedId,
  onSelect,
}: {
  group: CanvasGroup;
  data: CanvasData;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const meta = categoryOf(group.category);
  const liveCount = group.agentTypes.reduce((n, a) => n + (data.agentStats.get(a)?.live ?? 0), 0);
  const slots = data.graph.slots.filter((s) => s.groupId === group.id);
  return (
    <div className="relative size-full rounded-xl border border-border bg-canvas/70">
      <div className="flex h-8.5 items-center gap-1.5 px-3 text-xs">
        <meta.icon className="size-3.5 text-faint" strokeWidth={1.75} />
        <span className="font-medium text-muted-foreground">{meta.label}</span>
        <span className="text-faint tabular-nums">{group.agentTypes.length}</span>
        {liveCount ? (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-info">
            <span className="live-dot size-1.5 rounded-full bg-info" />
            {liveCount} live
          </span>
        ) : null}
      </div>
      {slots.map((s) => {
        const entry = data.agents.find((a) => a.agentType === s.agentType);
        if (!entry) return null;
        const id = `agent:${s.agentType}`;
        return (
          <div key={s.agentType} className="absolute" style={{ left: s.x, top: s.y, width: s.w, height: s.h }}>
            <TileButton id={id} selected={selectedId === id} onSelect={onSelect}>
              <AgentTile entry={entry} stat={data.agentStats.get(s.agentType)} />
            </TileButton>
          </div>
        );
      })}
    </div>
  );
}

function NodeTile({
  node,
  data,
  selectedId,
  onSelect,
}: {
  node: CanvasNode;
  data: CanvasData;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (node.kind === "group") {
    return <GroupFrame group={node as CanvasGroup} data={data} selectedId={selectedId} onSelect={onSelect} />;
  }
  let body: React.ReactNode = null;
  if (node.kind === "app") body = <AppTile data={data} />;
  if (node.kind === "api") body = <ApiTile data={data} />;
  if (node.kind === "review") body = <ReviewTile data={data} />;
  if (node.kind === "delivery") body = <DeliveryTile data={data} />;
  if (node.kind === "workflows") body = <WorkflowsTile data={data} />;
  if (node.kind === "endpoint") {
    body = <EndpointTile stat={data.endpointStats.find((e) => `endpoint:${e.label}` === node.id) ?? null} />;
  }
  if (node.kind === "mcp") {
    const server = data.serverList.find((s) => `mcp:${s.id}` === node.id);
    if (server) body = <McpTile server={server} grants={data.activeGrants.filter((g) => g.serverId === server.id).length} />;
  }
  const isPlaceholder = node.id === "endpoint:none";
  return (
    <TileButton id={node.id} selected={selectedId === node.id} onSelect={onSelect} className={isPlaceholder ? "border-dashed bg-transparent" : undefined}>
      {body}
    </TileButton>
  );
}

/** Below md the canvas becomes a straight line of tiles: same data, no pan and zoom. */
function MobileLine({ data, onSelect }: { data: CanvasData; onSelect: (id: string) => void }) {
  const order: CanvasNode[] = [
    ...data.graph.nodes.filter((n) => n.kind === "app" || n.kind === "api"),
    ...data.graph.nodes.filter((n) => n.kind === "review" || n.kind === "delivery" || n.kind === "endpoint"),
  ];
  const head = order.filter((n) => n.kind === "app" || n.kind === "api");
  const tail = order.filter((n) => n.kind !== "app" && n.kind !== "api");
  const tile = (n: CanvasNode) => (
    <div key={n.id} className="h-26">
      <NodeTile node={n} data={data} selectedId={null} onSelect={onSelect} />
    </div>
  );
  return (
    <div className="relative space-y-3 p-4">
      <span className="absolute inset-y-6 left-8 w-px bg-wire" aria-hidden />
      <div className="relative space-y-3">{head.map(tile)}</div>
      {data.graph.groups.map((g) => {
        const meta = categoryOf(g.category);
        return (
          <div key={g.id} className="relative rounded-xl border border-border bg-canvas p-2">
            <p className="flex items-center gap-1.5 px-1 pb-2 text-xs font-medium text-muted-foreground">
              <meta.icon className="size-3.5 text-faint" />
              {meta.label}
            </p>
            <div className="space-y-2">
              {g.agentTypes.map((a) => {
                const entry = data.agents.find((x) => x.agentType === a);
                return entry ? (
                  <div key={a} className="h-24">
                    <TileButton id={`agent:${a}`} selected={false} onSelect={onSelect}>
                      <AgentTile entry={entry} stat={data.agentStats.get(a)} />
                    </TileButton>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        );
      })}
      <div className="relative space-y-3">{tail.map(tile)}</div>
    </div>
  );
}

function ProjectCanvas() {
  const { orgId, projectId } = useProjectScope();
  const { values, set } = useUrlFilters(URL_KEYS);
  const range: RangeKey = isRangeKey(values.range) ? values.range : "7d";
  const [now] = useState(() => Date.now());
  const bounds = rangeBounds(range, now);
  const data = useCanvasData(orgId, projectId, bounds);
  const base = `/o/${orgId}/p/${projectId}`;
  const selectedId = values.node || null;
  const select = (id: string | null) => set({ node: id });

  useEffect(() => {
    if (!selectedId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") set({ node: null });
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, set]);

  const hasRuns = data.runs.isSuccess ? data.recentRuns.length > 0 : null;

  if (data.loading) {
    return (
      <div className="canvas-dots grid h-full flex-1 place-items-center">
        <Skeleton className="h-32 w-96 rounded-xl" />
      </div>
    );
  }

  const chrome = (
    <>
      <div className="pointer-events-none absolute top-3 right-3 left-3 z-20 flex items-start justify-between gap-3">
        <div className="pointer-events-auto min-w-0">
          <HealthStrip data={data} base={base} range={range} onRange={(r) => set({ range: r === "7d" ? null : r })} />
        </div>
        <div className="pointer-events-auto hidden shrink-0 md:block">
          <CreateMenu base={base} />
        </div>
      </div>
      <GoLiveCard data={data} base={base} projectId={projectId} hasRuns={hasRuns} />
      <ActivityDock data={data} base={base} projectId={projectId} shifted={!!selectedId} />
      {selectedId ? (
        <Inspector id={selectedId} data={data} base={base} projectId={projectId} onClose={() => select(null)} />
      ) : null}
    </>
  );

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0 hidden md:block">
        <CanvasSurface
          key={projectId}
          projectId={projectId}
          graph={data.graph}
          selectedId={selectedId}
          onSelect={select}
          renderNode={(n) => <NodeTile node={n} data={data} selectedId={selectedId} onSelect={select} />}
        >
          {chrome}
        </CanvasSurface>
      </div>
      <div className="absolute inset-0 overflow-y-auto md:hidden">
        <div className="canvas-dots min-h-full">
          <div className="p-3 pb-0">
            <HealthStrip data={data} base={base} range={range} onRange={(r) => set({ range: r === "7d" ? null : r })} />
          </div>
          <MobileLine data={data} onSelect={select} />
        </div>
        {selectedId ? (
          <div className="fixed inset-0 z-40">
            <Inspector id={selectedId} data={data} base={base} projectId={projectId} onClose={() => select(null)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ProjectCanvasPage() {
  return (
    <Suspense fallback={<div className="canvas-dots h-full" />}>
      <ProjectCanvas />
    </Suspense>
  );
}
