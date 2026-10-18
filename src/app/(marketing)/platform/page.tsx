import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { BRAND_NAME } from "@/lib/brand";
import { PILLARS, GUARANTEES, ROADMAP } from "@/data/platform";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import { ExecutionPreview } from "@/components/marketing/previews/execution-preview";
import { UsagePreview } from "@/components/marketing/previews/usage-preview";
import { ApprovalPreview } from "@/components/marketing/previews/approval-preview";

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

/** What the console shows, each beside a product shot of it. */
const CONSOLE_VIEWS = [
  {
    id: "console-runs",
    kicker: "Runs",
    title: "Every run, end to end.",
    body: "Open any run and see the job, the agent's own verdict and the callback as three separate facts, because a job can succeed while its delivery is still retrying. The timeline is built only from recorded timestamps, and the cost of every run is broken down to the token.",
    points: [
      "Job status · agent outcome · delivery status",
      "Checkpoints, delivery attempts and billing on one timeline",
      "Provider cost, markup and billed price per run",
    ],
    Preview: ExecutionPreview,
  },
  {
    id: "console-usage",
    kicker: "Usage & economics",
    title: "Spend you can trace to the record.",
    body: "Cost and runs by agent or model, against the previous period, with your budget beside them. Every bar breaks down into the priced records behind it, and those are the same records your invoice is built from.",
    points: [
      "Provider cost vs billed, by agent or model",
      "Failure rate from recorded outcomes",
      "Monthly cap that refuses work with a 402",
    ],
    Preview: UsagePreview,
  },
  {
    id: "console-approvals",
    kicker: "Approvals",
    title: "Review with the whole context.",
    body: "High-risk output waits for a person. Reviewers see what the agent was asked next to what it wants to deliver, can edit before approving, and every decision lands in the signed audit ledger.",
    points: [
      "Input beside the proposed delivery",
      "Edit, approve, or reject with a note that becomes a style rule",
      "Decision history from the signed ledger",
    ],
    Preview: ApprovalPreview,
  },
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
          <SectionHeading
            eyebrow="The console"
            title="An operations console, not a log viewer."
            lede="Everything the engine records shows up in your console: every run, every charge, every decision. It reads the same API your backend uses."
          />
        </Reveal>
        <div className="mt-14 space-y-20">
          {CONSOLE_VIEWS.map((v, i) => (
            <div
              key={v.id}
              id={v.id}
              className="grid scroll-mt-24 items-center gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
            >
              <Reveal className={i % 2 === 1 ? "lg:order-2" : undefined}>
                <p className="font-mono text-xs text-brand">{v.kicker}</p>
                <h3 className="mt-2 font-serif text-2xl text-foreground" style={{ fontWeight: 500 }}>
                  {v.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {v.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" aria-hidden />
                      {pt}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.08} className={i % 2 === 1 ? "lg:order-1" : undefined}>
                <v.Preview />
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <SectionHeading eyebrow="Capabilities" title="Ten things the engine does for you." />
          </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PILLARS.map((p, i) => (
            <Reveal key={p.id} delay={(i % 2) * 0.06}>
              <article id={p.id} className="flex h-full flex-col rounded-xl border border-border bg-background p-6">
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
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Guarantees"
              title="What we promise — and exactly where it stops."
              lede="Infrastructure claims are only useful when they're precise. Here are ours, with their limits."
            />
          </Reveal>
          <Reveal className="mt-12" delay={0.06}>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
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
