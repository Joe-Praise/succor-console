"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixedIcon, MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SignalComet } from "@/components/ops/signal-wire";
import {
  applyOffsets,
  boundsOf,
  fitView,
  openingView,
  wirePath,
  type CanvasEdge,
  type CanvasGraph,
  type CanvasNode,
  type NodeOffsets,
} from "@/features/canvas/graph";

const MIN_K = 0.3;
const MAX_K = 1.5;
const DRAG_THRESHOLD = 4;

function storageKey(projectId: string) {
  return `succor.canvas.${projectId}`;
}

/** Saved tile positions are a per-browser convenience: a failure just means default layout. */
function loadOffsets(projectId: string): NodeOffsets {
  try {
    return JSON.parse(localStorage.getItem(storageKey(projectId)) ?? "{}") as NodeOffsets;
  } catch {
    return {};
  }
}

function saveOffsets(projectId: string, offsets: NodeOffsets) {
  try {
    if (Object.keys(offsets).length) localStorage.setItem(storageKey(projectId), JSON.stringify(offsets));
    else localStorage.removeItem(storageKey(projectId));
  } catch {
    // Private mode or blocked storage: positions simply won't persist.
  }
}

const TONE_STROKE: Record<CanvasEdge["tone"], string> = {
  idle: "var(--wire)",
  live: "var(--info)",
  warn: "var(--warning)",
  error: "var(--error)",
};

function Wire({ d, edge }: { d: string; edge: CanvasEdge }) {
  const moving = edge.tone === "live";
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={TONE_STROKE[edge.tone]}
        strokeWidth={edge.tone === "idle" ? 1 : 1.25}
        strokeOpacity={moving ? 0.45 : 1}
        strokeDasharray={edge.soft ? "3 5" : undefined}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {moving ? <SignalComet path={d} color="var(--info)" /> : null}
    </g>
  );
}

export interface SurfaceProps {
  projectId: string;
  graph: CanvasGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Draws one top-level tile or group. */
  renderNode: (node: CanvasNode) => React.ReactNode;
  children?: React.ReactNode;
}

/**
 * The pannable, zoomable ground the tiles sit on. Drag empty space to pan, drag a tile to
 * move it (saved per browser), scroll to pan, ctrl/⌘ + scroll or the buttons to zoom.
 */
export function CanvasSurface({ projectId, graph, selectedId, onSelect, renderNode, children }: SurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  // The canvas only ever renders in the browser (the app shell waits for the session), and
  // the page keys this component by project, so positions load once per mounted project.
  const [offsets, setOffsets] = useState<NodeOffsets>(() => loadOffsets(projectId));
  const [ready, setReady] = useState(false);
  const fittedFor = useRef<string | null>(null);

  const allNodes = useMemo(
    () => applyOffsets<CanvasNode>([...graph.groups, ...graph.nodes], offsets),
    [graph, offsets],
  );
  const byId = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);

  const fit = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    const v = fitView(boundsOf(allNodes), { w: el.clientWidth, h: el.clientHeight });
    setView(v);
  }, [allNodes]);

  // Fit once per project when the graph first has content. Later data updates must not
  // yank the view out from under someone who has panned.
  useEffect(() => {
    if (allNodes.length === 0) return;
    const signature = `${projectId}:${graph.groups.length}`;
    if (fittedFor.current === signature) return;
    fittedFor.current = signature;
    const el = hostRef.current;
    if (el) setView(openingView(boundsOf(allNodes), { w: el.clientWidth, h: el.clientHeight }));
    setReady(true);
    // allNodes is read only for the first placement; live data must not re-open the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNodes.length, projectId, graph.groups.length]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = hostRef.current;
    if (!el) return;
    const px = cx ?? el.clientWidth / 2;
    const py = cy ?? el.clientHeight / 2;
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      return { k, x: px - wx * k, y: py - wy * k };
    });
  }, []);

  // Wheel must be non-passive to stop the browser zooming the page on ctrl + scroll.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const box = el!.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * 0.004), e.clientX - box.left, e.clientY - box.top);
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const drag = useRef<
    | { mode: "pan"; sx: number; sy: number; vx: number; vy: number; moved: boolean }
    | { mode: "tile"; id: string; sx: number; sy: number; nx: number; ny: number; k: number; moved: boolean }
    | null
  >(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-canvas-ui]")) return;
    const tile = target.closest<HTMLElement>("[data-node-id]");
    if (tile) {
      const node = byId.get(tile.dataset.nodeId!);
      if (!node) return;
      drag.current = { mode: "tile", id: node.id, sx: e.clientX, sy: e.clientY, nx: node.x, ny: node.y, k: view.k, moved: false };
    } else {
      drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
    }
    hostRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    if (d.mode === "pan") {
      setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
    } else {
      setOffsets((o) => ({ ...o, [d.id]: { x: d.nx + dx / d.k, y: d.ny + dy / d.k } }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    hostRef.current?.releasePointerCapture(e.pointerId);
    if (d.moved) {
      if (d.mode === "tile") {
        // Compute from this event: the last move's state may not have rendered yet.
        const next = { ...offsets, [d.id]: { x: d.nx + (e.clientX - d.sx) / d.k, y: d.ny + (e.clientY - d.sy) / d.k } };
        setOffsets(next);
        saveOffsets(projectId, next);
      }
      return;
    }
    // A press that didn't move is a click: select the tile under it, or clear.
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-select-id]");
    onSelect(hit?.dataset.selectId ?? null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.target !== hostRef.current) return;
    const step = 48;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (pan[e.key]) {
      e.preventDefault();
      const [dx, dy] = pan[e.key]!;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (e.key === "+" || e.key === "=") zoomAt(1.2);
    else if (e.key === "-") zoomAt(1 / 1.2);
    else if (e.key === "0") fit();
  }

  function resetLayout() {
    setOffsets({});
    saveOffsets(projectId, {});
    const el = hostRef.current;
    if (el) setView(fitView(boundsOf([...graph.groups, ...graph.nodes]), { w: el.clientWidth, h: el.clientHeight }));
  }

  const hasCustomLayout = Object.keys(offsets).length > 0;

  return (
    <div
      ref={hostRef}
      tabIndex={0}
      role="application"
      aria-label="Project canvas. Drag to pan, arrow keys to move, plus and minus to zoom, zero to fit."
      className="canvas-dots relative size-full touch-none overflow-hidden outline-none select-none"
      style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${22 * view.k}px ${22 * view.k}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <div
        className={cn("absolute top-0 left-0 origin-top-left", ready ? "opacity-100" : "opacity-0")}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden>
          {graph.edges.map((edge) => {
            const a = byId.get(edge.from);
            const b = byId.get(edge.to);
            return a && b ? <Wire key={edge.id} edge={edge} d={wirePath(a, b)} /> : null;
          })}
        </svg>
        {allNodes.map((n) => (
          <div
            key={n.id}
            data-node-id={n.id}
            className={cn("absolute", n.kind !== "group" && selectedId === n.id && "z-10")}
            style={{ left: n.x, top: n.y, width: n.w, height: n.h, cursor: "grab" }}
          >
            {renderNode(n)}
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div data-canvas-ui className="absolute top-14 left-3 z-20 flex flex-col overflow-hidden tile">
        <ZoomButton label="Zoom in" onClick={() => zoomAt(1.2)}>
          <PlusIcon />
        </ZoomButton>
        <span className="border-y border-hairline py-0.5 text-center font-mono text-[9px] text-faint tabular-nums">
          {Math.round(view.k * 100)}
        </span>
        <ZoomButton label="Zoom out" onClick={() => zoomAt(1 / 1.2)}>
          <MinusIcon />
        </ZoomButton>
        <ZoomButton label="Fit to view" onClick={fit} className="border-t border-hairline">
          <LocateFixedIcon />
        </ZoomButton>
        {hasCustomLayout ? (
          <ZoomButton label="Reset layout" onClick={resetLayout} className="border-t border-hairline">
            <RotateCcwIcon />
          </ZoomButton>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center text-muted-foreground transition-colors hover:bg-raised hover:text-foreground [&_svg]:size-3.5",
        className,
      )}
    >
      {children}
    </button>
  );
}
