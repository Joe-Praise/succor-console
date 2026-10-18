import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { BRAND_NAME } from "@/lib/brand";
import { PILLARS, GUARANTEES, ROADMAP } from "@/data/platform";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading, CtaBand } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: `Platform — ${BRAND_NAME}`,
  description:
    "Durable jobs, human approvals, multi-agent workflows, MCP tools, grounding, a signed audit ledger and hard budget caps — the engine under every agent.",
};

/** The request path, top to bottom, as it actually runs. */
const STACK: Array<{ layer: string; chips: string[]; tone?: "edge" | "core" }> = [
  { layer: "Your backend", chips: ["POST /agents/<type>", "GET /agents/jobs/:id"], tone: "edge" },
  { layer: "Guard chain", chips: ["key ↔ project", "budget cap", "enablement", "idempotency"] },
  { layer: "Durable queue", chips: ["202 + jobId", "lease + heartbeat", "backoff", "dead-letter"] },
  {
    layer: "Worker",
    chips: ["checkpointed model steps", "business profile", "retrieval", "style memory", "MCP tools"],
    tone: "core",
  },
  { layer: "Gate", chips: ["risk tier", "held for review", "edit · approve · reject"] },
  { layer: "Delivery", chips: ["durable effect", "retry 5xx / 429", "X-Delivery-Id"] },
  { layer: "Your API", chips: ["PUT /your/path", "X-Succor-Callback-Key"], tone: "edge" },
];

const SIDECARS = [
  { title: "Metering", body: "Every run → one priced, immutable row → monthly usage → itemized invoice." },
  { title: "Audit", body: "Every human decision → HMAC-signed, append-only ledger → sealed checkpoints." },
  { title: "Workflows", body: "Graphs of the same durable jobs — fan-out, join, critic gates." },
];

function ArchitectureStack() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <ol className="space-y-1.5" aria-label="Request path through the platform">
        {STACK.map((row, i) => (
          <li
            key={row.layer}
            className={
              "grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 rounded-xl border px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] " +
              (row.tone === "core"
                ? "border-brand bg-brand-muted"
                : row.tone === "edge"
                  ? "border-dashed border-strong bg-background"
                  : "border-border bg-surface")
            }
          >
            <span className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
              {String(i + 1).padStart(2, "0")} · {row.layer}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {row.chips.map((c) => (
                <span
                  key={c}
                  className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
      <div className="space-y-3">
        {SIDECARS.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-mono text-[10px] tracking-[0.18em] text-brand uppercase">alongside</p>
            <p className="mt-1 text-sm font-medium text-foreground">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlatformPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-14 text-center md:pt-28">
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">The platform</p>
        <h1
          className="mx-auto mt-4 max-w-3xl font-serif text-foreground"
          style={{ fontSize: "clamp(36px, 6vw, 60px)", lineHeight: 1.08, fontWeight: 500, letterSpacing: "-0.015em" }}
        >
          The engine under every agent.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Agents are the part you see. Underneath is the part that makes them safe to put in a product:
          durable jobs, human approvals, workflows, tool access, grounding, a signed audit trail and
          budgets that actually stop spend.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/register" />}>
            Start building
            <ArrowRightIcon />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/agents" />}>
            Browse the agents
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Anatomy of a call"
              title="Seven layers between your POST and your PUT."
              lede="Nothing is fire-and-forget. Each layer either refuses the work cleanly or hands it on with a durable record."
            />
          </Reveal>
          <Reveal className="mt-12" delay={0.08}>
            <ArchitectureStack />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading eyebrow="Capabilities" title="Ten things the engine does for you." />
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PILLARS.map((p, i) => (
            <Reveal key={p.id} delay={(i % 2) * 0.06}>
              <article id={p.id} className="flex h-full flex-col rounded-xl border border-border bg-surface p-6">
                <p className="font-mono text-xs text-brand">
                  {String(i + 1).padStart(2, "0")} · {p.kicker}
                </p>
                <h3 className="mt-2 font-serif text-xl text-foreground" style={{ fontWeight: 500 }}>
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" aria-hidden />
                      {pt}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Guarantees"
              title="What we promise — and exactly where it stops."
              lede="Infrastructure claims are only useful when they're precise. Here are ours, with their limits."
            />
          </Reveal>
          <Reveal className="mt-12" delay={0.06}>
            <div className="overflow-x-auto rounded-xl border border-border bg-background">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-faint">
                  <tr>
                    <th className="px-5 py-3 font-medium">Guarantee</th>
                    <th className="px-5 py-3 font-medium">How it holds</th>
                    <th className="px-5 py-3 font-medium">Where it stops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {GUARANTEES.map((g) => (
                    <tr key={g.claim} className="align-top">
                      <td className="px-5 py-4 font-medium text-foreground">{g.claim}</td>
                      <td className="px-5 py-4 text-muted-foreground">{g.how}</td>
                      <td className="px-5 py-4 text-muted-foreground">{g.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading eyebrow="Next" title="Where the engine is heading." />
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROADMAP.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-dashed border-strong p-5">
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
