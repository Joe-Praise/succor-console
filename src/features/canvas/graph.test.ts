import { describe, expect, it } from "vitest";

import { applyOffsets, boundsOf, buildCanvasGraph, endpointId, fitView, groupId, openingView, wirePath, type GraphInput } from "./graph";

const base: GraphInput = {
  agents: [
    { agentType: "seo-page-factory", category: "seo", gated: true },
    { agentType: "link-weaver", category: "seo", gated: false },
    { agentType: "quiz-generator", category: "elearning", gated: false },
  ],
  endpoints: [{ label: "production", url: "https://api.example.test" }],
  servers: [],
  workflowAgents: null,
  liveAgents: new Set(),
  waitingApprovals: 0,
  failingEndpoints: new Set(),
  delivering: false,
};

const edge = (g: ReturnType<typeof buildCanvasGraph>, id: string) => g.edges.find((e) => e.id === id);

describe("buildCanvasGraph", () => {
  it("lays the request path out left to right", () => {
    const g = buildCanvasGraph(base);
    const x = (id: string) => [...g.nodes, ...g.groups].find((n) => n.id === id)!.x;
    expect(x("app")).toBeLessThan(x("api"));
    expect(x("api")).toBeLessThan(x(groupId("seo")));
    expect(x(groupId("seo"))).toBeLessThan(x("delivery"));
    expect(x("review")).toBe(x("delivery"));
    expect(x("delivery")).toBeLessThan(x(endpointId("production")));
  });

  it("omits human review when no enabled agent is gated, and never routes through it", () => {
    const g = buildCanvasGraph({ ...base, agents: base.agents.filter((a) => !a.gated) });
    expect(g.nodes.some((n) => n.kind === "review")).toBe(false);
    expect(g.edges.some((e) => e.to === "review" || e.from === "review")).toBe(false);
  });

  it("sends a group with gated and ungated agents to both review and delivery", () => {
    const g = buildCanvasGraph(base);
    expect(edge(g, `${groupId("seo")}>review`)).toBeTruthy();
    expect(edge(g, `${groupId("seo")}>delivery`)).toBeTruthy();
    expect(edge(g, `${groupId("elearning")}>review`)).toBeUndefined();
  });

  it("sends a group of only gated agents through review alone", () => {
    const g = buildCanvasGraph({ ...base, agents: [{ agentType: "seo-page-factory", category: "seo", gated: true }] });
    expect(edge(g, `${groupId("seo")}>delivery`)).toBeUndefined();
    expect(edge(g, `${groupId("seo")}>review`)).toBeTruthy();
    expect(edge(g, "review>delivery")).toBeTruthy();
  });

  it("lights only the wires a running agent actually uses", () => {
    const g = buildCanvasGraph({ ...base, liveAgents: new Set(["quiz-generator"]) });
    expect(edge(g, `api>${groupId("elearning")}`)?.tone).toBe("live");
    expect(edge(g, `api>${groupId("seo")}`)?.tone).toBe("idle");
    expect(edge(g, "app>api")?.tone).toBe("live");
  });

  it("shows a held delivery on the review wires", () => {
    const g = buildCanvasGraph({ ...base, waitingApprovals: 2 });
    expect(edge(g, `${groupId("seo")}>review`)?.tone).toBe("warn");
    expect(edge(g, "review>delivery")?.tone).toBe("warn");
  });

  it("marks a failing endpoint without touching a healthy one", () => {
    const g = buildCanvasGraph({
      ...base,
      endpoints: [
        { label: "production", url: "https://a.test" },
        { label: "local", url: "http://localhost:5000" },
      ],
      failingEndpoints: new Set(["production"]),
    });
    expect(edge(g, "delivery>production")?.tone).toBe("error");
    expect(edge(g, "delivery>local")?.tone).toBe("idle");
  });

  it("draws a placeholder endpoint when no callback URL is set, with no wire to it", () => {
    const g = buildCanvasGraph({ ...base, endpoints: [] });
    expect(g.nodes.some((n) => n.id === endpointId("none"))).toBe(true);
    expect(g.edges.some((e) => e.to === endpointId("none"))).toBe(false);
  });

  it("wires a tool server only to the groups holding a grant, as a soft edge", () => {
    const g = buildCanvasGraph({ ...base, servers: [{ id: "s1", enabled: true, agentTypes: ["quiz-generator"] }] });
    const wires = g.edges.filter((e) => e.from === "mcp:s1");
    expect(wires.map((w) => w.to)).toEqual([groupId("elearning")]);
    expect(wires[0]?.soft).toBe(true);
  });

  it("ignores a grant for an agent that isn't enabled", () => {
    const g = buildCanvasGraph({ ...base, servers: [{ id: "s1", enabled: true, agentTypes: ["not-enabled"] }] });
    expect(g.edges.some((e) => e.from === "mcp:s1")).toBe(false);
  });

  it("never overlaps tiles in a group", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ agentType: `a${i}`, category: i % 2 ? "seo" : "content", gated: false }));
    const g = buildCanvasGraph({ ...base, agents: many });
    for (const a of g.slots) {
      for (const b of g.slots) {
        if (a === b || a.groupId !== b.groupId) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe("layout helpers", () => {
  it("applies dragged offsets and ignores unknown ids", () => {
    const moved = applyOffsets([{ id: "a", x: 0, y: 0, w: 1, h: 1 }], { a: { x: 9, y: 8 }, gone: { x: 1, y: 1 } });
    expect(moved[0]).toMatchObject({ x: 9, y: 8 });
    expect(moved).toHaveLength(1);
  });

  it("computes bounds, including an empty set", () => {
    expect(boundsOf([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(boundsOf([{ x: 10, y: 10, w: 5, h: 5 }, { x: 0, y: 20, w: 2, h: 2 }])).toEqual({ x: 0, y: 10, w: 15, h: 12 });
  });

  it("fits without enlarging past 1:1", () => {
    expect(fitView({ x: 0, y: 0, w: 100, h: 100 }, { w: 2000, h: 2000 }).k).toBe(1);
    expect(fitView({ x: 0, y: 0, w: 4000, h: 1000 }, { w: 1000, h: 800 }).k).toBeLessThan(1);
  });

  it("opens fitted when readable, and at a readable zoom when not", () => {
    expect(openingView({ x: 0, y: 0, w: 600, h: 300 }, { w: 1400, h: 800 }).k).toBe(1);
    expect(openingView({ x: 0, y: 0, w: 6000, h: 1000 }, { w: 1400, h: 800 }).k).toBe(0.74);
  });

  it("joins stacked tiles bottom to top", () => {
    expect(wirePath({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 50, w: 10, h: 10 })).toBe("M5,10 V50");
  });

  it("draws a square wire with room and a curve when tiles cross", () => {
    expect(wirePath({ x: 0, y: 0, w: 10, h: 10 }, { x: 100, y: 0, w: 10, h: 10 })).toBe("M10,5 H100");
    expect(wirePath({ x: 0, y: 0, w: 10, h: 10 }, { x: 100, y: 50, w: 10, h: 10 })).toContain("Q");
    expect(wirePath({ x: 100, y: 0, w: 10, h: 10 }, { x: 0, y: 50, w: 10, h: 10 })).toContain("C");
  });
});
