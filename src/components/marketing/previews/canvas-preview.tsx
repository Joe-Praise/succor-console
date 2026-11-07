"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2Icon, EyeIcon, GlobeIcon, GraduationCapIcon, LoaderCircleIcon, PenLineIcon, SearchIcon, SendIcon, ServerIcon, StampIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import { boundsOf, buildCanvasGraph, fitView, wirePath, type CanvasEdge } from "@/features/canvas/graph";
import { PreviewFrame } from "./preview-frame";
import { SignalComet } from "@/components/ops/signal-wire";

/**
 * The project canvas as a marketing shot: the real graph builder and wire geometry, fed
 * sample agents. The wires animate the way they do in the product when work is live.
 */

interface SampleAgent {
  agentType: string;
  name: string;
  category: string;
  gated?: boolean;
  state: "ok" | "live" | "held";
  note: string;
  stat: string;
}

const AGENTS: SampleAgent[] = [
  { agentType: "seo-page-factory", name: "SEO Page Factory", category: "seo", gated: true, state: "held", note: "Awaiting approval · 2m", stat: "96 runs · $13.44" },
  { agentType: "link-weaver", name: "Link Weaver", category: "seo", state: "ok", note: "Succeeded · 8m", stat: "54 runs · $4.10" },
  { agentType: "campaign-writer", name: "Campaign Writer", category: "content", state: "live", note: "1 running", stat: "81 runs · $14.63" },
  { agentType: "insights-writer", name: "Insights Writer", category: "content", state: "ok", note: "Succeeded · 7h", stat: "37 runs · $11.68" },
  { agentType: "quiz-generator", name: "Quiz Generator", category: "elearning", state: "ok", note: "Succeeded · 3m", stat: "112 runs · $9.22" },
  { agentType: "course-summariser", name: "Course Summariser", category: "elearning", state: "ok", note: "Succeeded · 1h", stat: "63 runs · $5.74" },
  { agentType: "visual-tagger", name: "Visual Tagger", category: "vision", state: "ok", note: "Succeeded · 5h", stat: "89 runs · $15.21" },
  { agentType: "alt-text-optimizer", name: "Alt Text Optimizer", category: "vision", state: "ok", note: "Succeeded · 2h", stat: "51 runs · $5.74" },
  { agentType: "auto-tagger", name: "Auto Tagger", category: "elearning", state: "ok", note: "Succeeded · 3h", stat: "44 runs · $3.12" },
];

const CATEGORY: Record<string, { label: string; icon: LucideIcon }> = {
  seo: { label: "SEO", icon: SearchIcon },
  content: { label: "Content", icon: PenLineIcon },
  elearning: { label: "E-learning", icon: GraduationCapIcon },
  vision: { label: "Vision", icon: EyeIcon },
};

const TONE: Record<CanvasEdge["tone"], string> = { idle: "var(--wire)", live: "var(--info)", warn: "var(--warning)", error: "var(--error)" };

function Mini({ icon, title, sub, line, tone = "ok" }: { icon: React.ReactNode; title: string; sub?: string; line: string; tone?: "ok" | "live" | "held" }) {
  const StateIcon = tone === "live" ? LoaderCircleIcon : tone === "held" ? StampIcon : CheckCircle2Icon;
  return (
    <div className="tile flex size-full flex-col justify-between p-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-px shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">{title}</p>
          {sub ? <p className="truncate font-mono text-[11px] leading-4 text-faint">{sub}</p> : null}
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <StateIcon className={cn("size-3.5 shrink-0", tone === "live" ? "animate-spin text-info" : tone === "held" ? "text-warning" : "text-success")} aria-hidden />
        <span className="truncate">{line}</span>
      </p>
    </div>
  );
}

export function CanvasPreview({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const graph = useMemo(
    () =>
      buildCanvasGraph({
        agents: AGENTS.map((a) => ({ agentType: a.agentType, category: a.category, gated: !!a.gated })),
        endpoints: [{ label: "production", url: "https://api.northwind.example" }],
        servers: [],
        workflowAgents: null,
        liveAgents: new Set(["campaign-writer"]),
        waitingApprovals: 1,
        failingEndpoints: new Set(),
        delivering: true,
      }),
    [],
  );
  const nodes = useMemo(() => [...graph.groups, ...graph.nodes], [graph]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [view, setView] = useState<{ x: number; y: number; k: number } | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const place = () => setView(fitView(boundsOf(nodes), { w: el.clientWidth, h: el.clientHeight }, { top: 24, right: 24, bottom: 24, left: 24 }));
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodes]);

  return (
    <PreviewFrame path="northwind / production-api" activeTab="Canvas" bleed className={className} caption="The project canvas: your backend calling the Succor API, agents grouped by category, human review and delivery, and your callback endpoint, joined by wires that move while work is live.">
      <div ref={hostRef} className="canvas-dots relative aspect-[16/8] w-full overflow-hidden">
        {view ? (
          <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
            <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden>
              {graph.edges.map((e) => {
                const a = byId.get(e.from);
                const b = byId.get(e.to);
                if (!a || !b) return null;
                const d = wirePath(a, b);
                return (
                  <g key={e.id}>
                    <path d={d} fill="none" stroke={TONE[e.tone]} strokeWidth={e.tone === "idle" ? 1 : 1.25} strokeOpacity={e.tone === "live" ? 0.45 : 1} vectorEffect="non-scaling-stroke" />
                    {e.tone === "live" ? <SignalComet path={d} color="var(--info)" /> : null}
                  </g>
                );
              })}
            </svg>
            {nodes.map((n) => {
              if (n.kind === "group") {
                const g = graph.groups.find((x) => x.id === n.id)!;
                const meta = CATEGORY[g.category]!;
                const slots = graph.slots.filter((s) => s.groupId === g.id);
                return (
                  <div key={n.id} className="absolute rounded-xl border border-border bg-canvas/70" style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
                    <p className="flex h-8.5 items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground">
                      <meta.icon className="size-3.5 text-faint" strokeWidth={1.75} />
                      {meta.label}
                    </p>
                    {slots.map((s) => {
                      const a = AGENTS.find((x) => x.agentType === s.agentType)!;
                      return (
                        <div key={s.agentType} className="absolute" style={{ left: s.x, top: s.y, width: s.w, height: s.h }}>
                          <Mini icon={<meta.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />} title={a.name} sub={a.stat} line={a.note} tone={a.state} />
                        </div>
                      );
                    })}
                  </div>
                );
              }
              const tile =
                n.kind === "app" ? (
                  <Mini icon={<ServerIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />} title="Your backend" sub="2 active API keys" line="Last request 1m ago" />
                ) : n.kind === "api" ? (
                  <Mini icon={<BrandMark size={16} />} title="Succor API" sub="34% of budget" line="Accepting requests" />
                ) : n.kind === "review" ? (
                  <Mini icon={<StampIcon className="size-4 text-warning" strokeWidth={1.75} />} title="Human review" sub="seo-page-factory" line="1 waiting for a decision" tone="held" />
                ) : n.kind === "delivery" ? (
                  <Mini icon={<SendIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />} title="Delivery" sub="3 attempts" line="398 delivered" />
                ) : (
                  <Mini icon={<GlobeIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />} title="production" sub="api.northwind.example" line="Last delivered 1m ago" />
                );
              return (
                <div key={n.id} className="absolute" style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
                  {tile}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </PreviewFrame>
  );
}

