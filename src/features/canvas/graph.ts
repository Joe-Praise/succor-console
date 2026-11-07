/**
 * The project canvas as data: which tiles exist, where they sit, and how they're wired.
 * Pure, so it can be unit-tested and so the drawing layer stays dumb.
 *
 * The graph is the real request path, left to right:
 *   your backend → Succor API → agents (grouped) → human review → delivery → your endpoints
 * Nothing is drawn that the backend doesn't actually do. A workflow wires straight to the
 * agent groups it ran because the advancer enqueues jobs without going through the API.
 */

export const TILE = { w: 216, h: 104 } as const;
export const AGENT_TILE = { w: 204, h: 96 } as const;

const COL_GAP = 72;
const ROW_GAP = 24;
const GROUP_PAD = 10;
const GROUP_HEADER = 34;
const GROUP_GAP = 10;
const MASONRY_GAP = 24;

export type CanvasNodeKind = "app" | "api" | "group" | "review" | "delivery" | "endpoint" | "mcp" | "workflows";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CanvasNode extends Rect {
  id: string;
  kind: CanvasNodeKind;
}

export interface AgentSlot extends Rect {
  agentType: string;
  /** Group the tile sits in; its x/y are relative to that group. */
  groupId: string;
}

export interface CanvasGroup extends CanvasNode {
  kind: "group";
  category: string;
  agentTypes: string[];
}

export type EdgeTone = "idle" | "live" | "warn" | "error";

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  tone: EdgeTone;
  /** Dashed: an optional or indirect relationship (tools, workflows). */
  soft?: boolean;
}

export interface GraphAgent {
  agentType: string;
  category: string;
  gated: boolean;
}

export interface GraphInput {
  agents: GraphAgent[];
  /** Callback base URLs, in project order. */
  endpoints: Array<{ label: string; url: string }>;
  /** MCP servers, with the agents holding an active grant on each. */
  servers: Array<{ id: string; enabled: boolean; agentTypes: string[] }>;
  /** Agent types recent workflows ran; null when the project has no workflows. */
  workflowAgents: string[] | null;
  liveAgents: ReadonlySet<string>;
  waitingApprovals: number;
  /** Endpoint labels whose recent deliveries are failing. */
  failingEndpoints: ReadonlySet<string>;
  /** A callback is queued or in flight right now. */
  delivering: boolean;
}

export interface CanvasGraph {
  nodes: CanvasNode[];
  groups: CanvasGroup[];
  slots: AgentSlot[];
  edges: CanvasEdge[];
}

export type NodeOffsets = Record<string, { x: number; y: number }>;

export const CATEGORY_ORDER = ["seo", "content", "analysis", "elearning", "vision", "utility"];

export function groupId(category: string): string {
  return `group:${category}`;
}

export function endpointId(label: string): string {
  return `endpoint:${label}`;
}

export function mcpId(serverId: string): string {
  return `mcp:${serverId}`;
}

function sizeGroup(count: number): { cols: number; rows: number; w: number; h: number } {
  const cols = count >= 3 ? 2 : 1;
  const rows = Math.ceil(count / cols);
  return {
    cols,
    rows,
    w: GROUP_PAD * 2 + cols * AGENT_TILE.w + (cols - 1) * GROUP_GAP,
    h: GROUP_HEADER + GROUP_PAD + rows * AGENT_TILE.h + (rows - 1) * GROUP_GAP,
  };
}

export function buildCanvasGraph(input: GraphInput): CanvasGraph {
  const { agents, endpoints, servers, workflowAgents, liveAgents, waitingApprovals, failingEndpoints, delivering } = input;

  // ── Groups: one per category, in a stable order.
  const byCategory = new Map<string, GraphAgent[]>();
  for (const a of agents) byCategory.set(a.category, [...(byCategory.get(a.category) ?? []), a]);
  const categories = [...byCategory.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // Many agents flow into two columns so the canvas stays wide rather than endless.
  const masonry = agents.length > 8 ? 2 : 1;
  const columns: Array<{ h: number; items: Array<{ category: string; size: ReturnType<typeof sizeGroup> }> }> =
    Array.from({ length: masonry }, () => ({ h: 0, items: [] }));
  const sized = categories
    .map((category) => ({ category, size: sizeGroup(byCategory.get(category)!.length) }))
    .sort((a, b) => (masonry > 1 ? b.size.h - a.size.h : 0));
  for (const g of sized) {
    const col = columns.reduce((best, c) => (c.h < best.h ? c : best), columns[0]!);
    col.items.push(g);
    col.h += g.size.h + ROW_GAP;
  }
  const colWidth = (items: (typeof columns)[number]["items"]) => Math.max(AGENT_TILE.w + GROUP_PAD * 2, ...items.map((i) => i.size.w));
  const groupsHeight = Math.max(TILE.h * 2, ...columns.map((c) => c.h - ROW_GAP));

  const apiX = TILE.w + COL_GAP;
  const groupsX = apiX + TILE.w + COL_GAP;
  const centerY = groupsHeight / 2;

  const groups: CanvasGroup[] = [];
  const slots: AgentSlot[] = [];
  let nextX = groupsX;
  for (const col of columns) {
    let y = (groupsHeight - (col.h - ROW_GAP)) / 2;
    const width = colWidth(col.items);
    for (const { category, size } of col.items) {
      const members = byCategory.get(category)!;
      const id = groupId(category);
      groups.push({ id, kind: "group", category, agentTypes: members.map((m) => m.agentType), x: nextX, y, w: size.w, h: size.h });
      members.forEach((m, i) => {
        slots.push({
          agentType: m.agentType,
          groupId: id,
          x: GROUP_PAD + (i % size.cols) * (AGENT_TILE.w + GROUP_GAP),
          y: GROUP_HEADER + Math.floor(i / size.cols) * (AGENT_TILE.h + GROUP_GAP),
          w: AGENT_TILE.w,
          h: AGENT_TILE.h,
        });
      });
      y += size.h + ROW_GAP;
    }
    nextX += width + MASONRY_GAP;
  }
  const afterGroups = (groups.length ? nextX - MASONRY_GAP : groupsX + TILE.w) + COL_GAP;

  // Human review stands directly above delivery: a held result drops straight down into it.
  const anyGated = agents.some((a) => a.gated);
  const deliveryX = afterGroups;
  const endpointX = deliveryX + TILE.w + COL_GAP;

  const nodes: CanvasNode[] = [
    { id: "app", kind: "app", x: 0, y: centerY - TILE.h / 2, ...TILE },
    { id: "api", kind: "api", x: apiX, y: centerY - TILE.h / 2, ...TILE },
    { id: "delivery", kind: "delivery", x: deliveryX, y: centerY - TILE.h / 2, ...TILE },
  ];
  if (anyGated) nodes.push({ id: "review", kind: "review", x: deliveryX, y: centerY - TILE.h / 2 - TILE.h - 48, ...TILE });

  const endpointRows = Math.max(endpoints.length, 1);
  const endpointsH = endpointRows * TILE.h + (endpointRows - 1) * ROW_GAP;
  const endpointList = endpoints.length ? endpoints : [{ label: "none", url: "" }];
  endpointList.forEach((e, i) => {
    nodes.push({ id: endpointId(e.label), kind: "endpoint", x: endpointX, y: centerY - endpointsH / 2 + i * (TILE.h + ROW_GAP), ...TILE });
  });

  // Tools and workflows hang off the agents from the left, above and below the API.
  servers.forEach((s, i) => {
    nodes.push({ id: mcpId(s.id), kind: "mcp", x: apiX, y: centerY + TILE.h / 2 + ROW_GAP + 28 + i * (TILE.h + ROW_GAP), ...TILE });
  });
  if (workflowAgents) nodes.push({ id: "workflows", kind: "workflows", x: apiX, y: centerY - TILE.h * 1.5 - ROW_GAP - 28, ...TILE });

  // ── Edges
  const groupOf = new Map(slots.map((s) => [s.agentType, s.groupId]));
  const groupLive = (g: CanvasGroup) => g.agentTypes.some((a) => liveAgents.has(a));
  const anyLive = liveAgents.size > 0;
  const edges: CanvasEdge[] = [{ id: "app>api", from: "app", to: "api", tone: anyLive ? "live" : "idle" }];

  for (const g of groups) {
    const tone: EdgeTone = groupLive(g) ? "live" : "idle";
    edges.push({ id: `api>${g.id}`, from: "api", to: g.id, tone });
    const members = agents.filter((a) => g.agentTypes.includes(a.agentType));
    if (members.some((m) => !m.gated)) edges.push({ id: `${g.id}>delivery`, from: g.id, to: "delivery", tone });
    if (members.some((m) => m.gated)) {
      edges.push({ id: `${g.id}>review`, from: g.id, to: "review", tone: waitingApprovals > 0 ? "warn" : "idle" });
    }
  }
  if (anyGated) edges.push({ id: "review>delivery", from: "review", to: "delivery", tone: waitingApprovals > 0 ? "warn" : "idle" });

  for (const e of endpoints) {
    edges.push({
      id: `delivery>${e.label}`,
      from: "delivery",
      to: endpointId(e.label),
      tone: failingEndpoints.has(e.label) ? "error" : delivering ? "live" : "idle",
    });
  }

  for (const s of servers) {
    const touched = new Set(s.agentTypes.map((a) => groupOf.get(a)).filter((g): g is string => !!g));
    for (const g of touched) edges.push({ id: `${mcpId(s.id)}>${g}`, from: mcpId(s.id), to: g, tone: "idle", soft: true });
  }
  if (workflowAgents) {
    const touched = new Set(workflowAgents.map((a) => groupOf.get(a)).filter((g): g is string => !!g));
    for (const g of touched) edges.push({ id: `workflows>${g}`, from: "workflows", to: g, tone: "idle", soft: true });
  }

  return { nodes, groups, slots, edges };
}

/** Apply dragged positions. Unknown ids (a tile that no longer exists) are ignored. */
export function applyOffsets<T extends Rect & { id: string }>(items: T[], offsets: NodeOffsets): T[] {
  return items.map((n) => (offsets[n.id] ? { ...n, ...offsets[n.id] } : n));
}

export function boundsOf(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/**
 * The view a project opens on: fitted when that stays readable, otherwise a readable
 * zoom anchored on the left, where the request path starts.
 */
export function openingView(bounds: Rect, viewport: { w: number; h: number }, minK = 0.68): { x: number; y: number; k: number } {
  const fitted = fitView(bounds, viewport);
  if (fitted.k >= minK) return fitted;
  return { k: minK, x: 72 - bounds.x * minK, y: Math.max(64, (viewport.h - bounds.h * minK) / 2) - bounds.y * minK };
}

/** Scale + offset that fits `bounds` in a viewport, never enlarging past 1:1. */
export function fitView(
  bounds: Rect,
  viewport: { w: number; h: number },
  pad = { top: 64, right: 48, bottom: 64, left: 72 },
): { x: number; y: number; k: number } {
  if (bounds.w === 0 || viewport.w === 0) return { x: pad.left, y: pad.top, k: 1 };
  const k = Math.max(
    0.3,
    Math.min(1, (viewport.w - pad.left - pad.right) / bounds.w, (viewport.h - pad.top - pad.bottom) / bounds.h),
  );
  return {
    k,
    x: pad.left + (viewport.w - pad.left - pad.right - bounds.w * k) / 2 - bounds.x * k,
    y: pad.top + (viewport.h - pad.top - pad.bottom - bounds.h * k) / 2 - bounds.y * k,
  };
}

/**
 * A wire from the right edge of one tile to the left edge of the next: square with
 * rounded corners when there's room, a smooth curve when a dragged tile has crossed over.
 */
export function wirePath(from: Rect, to: Rect): string {
  // Stacked tiles join bottom to top.
  if (Math.abs(from.x - to.x) < to.w / 2 && to.y >= from.y + from.h) {
    const cx1 = from.x + from.w / 2;
    const cx2 = to.x + to.w / 2;
    const y1 = from.y + from.h;
    return cx1 === cx2 ? `M${cx1},${y1} V${to.y}` : `M${cx1},${y1} C${cx1},${y1 + 24} ${cx2},${to.y - 24} ${cx2},${to.y}`;
  }
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  if (x2 < x1 + 32) {
    const bend = Math.max(60, (x1 - x2) / 2 + 60);
    return `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`;
  }
  if (Math.abs(y2 - y1) < 1) return `M${x1},${y1} H${x2}`;
  const midX = x2 - Math.min(52, (x2 - x1) / 2);
  const r = Math.min(10, Math.abs(y2 - y1) / 2, (x2 - x1) / 4);
  const dir = y2 > y1 ? 1 : -1;
  return `M${x1},${y1} H${midX - r} Q${midX},${y1} ${midX},${y1 + dir * r} V${y2 - dir * r} Q${midX},${y2} ${midX + r},${y2} H${x2}`;
}
