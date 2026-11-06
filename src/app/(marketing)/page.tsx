import type { Metadata } from "next";
import Link from "next/link";
import {
  ActivityIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  FingerprintIcon,
  HistoryIcon,
  IdCardIcon,
  KeyRoundIcon,
  LayersIcon,
  LibraryIcon,
  PencilLineIcon,
  PlugZapIcon,
  ReceiptTextIcon,
  RepeatIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon,
  WorkflowIcon,
} from "lucide-react";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { CATEGORY_META, CATALOG_COUNTS, MARKETING_CATALOG } from "@/data/marketing-catalog";
import { Button } from "@/components/ui/button";
import { NightRidge } from "@/components/illustrations/night-ridge";
import { Reveal } from "@/components/marketing/reveal";
import { CtaBand, Faq, SectionHeading } from "@/components/marketing/section";
import { ProductDock } from "@/components/marketing/product-dock";
import { SignalSpine, type SpineSection } from "@/components/marketing/signal-spine";
import { SpinePanel } from "@/components/marketing/spine-panel";
import { ApprovalPreview } from "@/components/marketing/previews/approval-preview";
import { ExecutionPreview } from "@/components/marketing/previews/execution-preview";
import { UsagePreview } from "@/components/marketing/previews/usage-preview";
import { DeliverySimulator, GuardChain } from "@/features/docs/diagrams";

export const metadata: Metadata = {
  title: `${BRAND_NAME}: production agents, workflows and automation`,
  description: BRAND_TAGLINE,
};

const SECTIONS: SpineSection[] = [
  { id: "call", label: "Call", color: "#6ea8fe", tint: "#141a29" },
  { id: "run", label: "Run", color: "#4fd18b", tint: "#121f1b" },
  { id: "review", label: "Review", color: "#f2b84b", tint: "#221b10" },
  { id: "deliver", label: "Deliver", color: "#f27d4f", tint: "#231511" },
  { id: "observe", label: "Observe", color: "#b18cf9", tint: "#1a1426" },
];

const ENGINE = [
  { icon: WorkflowIcon, title: "Workflows", body: "Chain agents into durable graphs with fan-out and quality gates.", href: "/docs/workflows" },
  { icon: PlugZapIcon, title: "Tools over MCP", body: "Grant one read-only tool to one agent. Nothing more reaches the model.", href: "/docs/tools" },
  { icon: LibraryIcon, title: "Grounding and memory", body: "Writers read what you've published, skip duplicates, and learn your style.", href: "/docs/grounding" },
  { icon: IdCardIcon, title: "Business profile", body: "Describe your business once. Every prompt reads it as fenced data.", href: "/docs/profile" },
];

const FAQ_ITEMS = [
  {
    q: "Do we manage models or infrastructure?",
    a: "No. You never touch a model, a provider account, a prompt or a server. You call the agent and we operate everything behind it. The contract stays stable as what's under it improves.",
  },
  {
    q: "What happens when an agent fails mid-run?",
    a: "Each call is a durable job: leased by a worker, checkpointed per model step, and metered once at the end. If the process dies, another worker reclaims the job and replays finished steps instead of paying for them again. A job that exhausts its attempts is dead-lettered with the reason, visible on its page.",
  },
  {
    q: "Can a person review output before it reaches our app?",
    a: "Yes. High-risk agents hold their delivery until a project admin approves it in the console, with optional edits. A rejection note is kept as a style rule, so the next generation avoids the same mistake.",
  },
  {
    q: "Can agents use our own data?",
    a: "Three ways. Writer agents retrieve your published content as reference and skip near-duplicates. A business profile tells every agent who you are. And tool-ready agents can call read-only tools on your own MCP servers, one explicitly granted tool at a time.",
  },
  {
    q: "What stops a runaway bill?",
    a: "A monthly cap per project. Once it's reached, new calls return 402 until you raise it or the month rolls. It's a soft cap: spend is counted after a run bills, so a burst can overshoot slightly, jobs already accepted still finish, and workflow steps aren't checked against it.",
  },
  {
    q: "How long does integration take?",
    a: "One POST plus one callback endpoint. The docs have working code for both sides, filled in with your project's values.",
  },
  {
    q: "How does billing work?",
    a: "Cost-plus: a run's price is the model's metered cost times a simple multiplier. You see both numbers on every run, and invoices are monthly per project, itemized by agent.",
  },
  {
    q: "Can I get a custom agent?",
    a: "Yes. Request one from your console. We scope it with you, build and validate it, wrap it in the same guardrails as everything else, and ship it to your catalog.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero: the illustration, with the product floating over its lower edge ── */}
      <div className="px-3 pt-3 md:px-4">
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/6">
          <NightRidge tone="dusk" />
          <div className="relative z-10 mx-auto max-w-310 px-4 pt-20 pb-10 md:px-8 md:pt-28">
            <div className="mx-auto max-w-5xl text-center">
              <h1 className="display text-[clamp(42px,7vw,84px)] text-balance text-white">Agents that finish the job</h1>
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/85 md:text-[17px]">
                One API call becomes a durable job: run, validated, held for a person when it matters, and delivered to your API. You ship the feature. We run
                the machinery.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                <Button size="lg" render={<Link href="/register" />}>
                  Start building
                  <ArrowRightIcon />
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 bg-black/20 text-white hover:bg-white/10" render={<Link href="/docs" />}>
                  Read the docs
                </Button>
              </div>
            </div>
            <div className="mt-14 md:mt-20">
              <ProductDock />
            </div>
          </div>
        </section>
      </div>

      {/* ── The line: five stations, each its own tinted panel ── */}
      <SignalSpine sections={SECTIONS}>
        <SpinePanel
          section={SECTIONS[0]!}
          chip="Call"
          title="One request in. A durable job out."
          lede={
            <>
              A POST answers 202 with a job id in milliseconds, after checking your key, budget, enablement and idempotency. From there a crash can&apos;t lose it.{" "}
              <Link href="/docs/responses" className="font-medium text-white hover:underline">
                See every response →
              </Link>
            </>
          }
          features={[
            { icon: RepeatIcon, title: "Safe to retry", body: "Send a requestId and a retried request can't run or bill twice." },
            { icon: LayersIcon, title: `${MARKETING_CATALOG.length} agents, one API`, body: "Every agent has a fixed schema and a fixed callback your code can rely on." },
            { icon: KeyRoundIcon, title: "Keys done right", body: "Project-scoped, shown once, hashed at rest, revocable in a click." },
          ]}
        >
          <Reveal>
            <div className="[&>div]:my-0">
              <GuardChain />
            </div>
          </Reveal>
        </SpinePanel>

        <SpinePanel
          section={SECTIONS[1]!}
          chip="Run"
          title="Crashes resume. They don't restart."
          lede={
            <>
              A worker leases each job, heartbeats while it runs, and checkpoints every model step. If it dies, another worker carries on from the last step.{" "}
              <Link href="/docs/jobs" className="font-medium text-white hover:underline">
                How jobs work →
              </Link>
            </>
          }
          features={[
            { icon: HistoryIcon, title: "Checkpointed steps", body: "A retry replays finished steps instead of paying for them again." },
            { icon: ReceiptTextIcon, title: "Billed once", body: "Only the worker holding the current lease can finish a job, so a stolen lease can't charge you twice." },
            { icon: ActivityIcon, title: "A dead job says why", body: "Exhausted jobs are dead-lettered with a reason you can read, not silently dropped." },
          ]}
        >
          <Reveal>
            <ExecutionPreview />
          </Reveal>
        </SpinePanel>

        <SpinePanel
          section={SECTIONS[2]!}
          chip="Review"
          title="A person, where it matters."
          lede={
            <>
              High-risk agents generate and validate, then stop. Nothing reaches your API until an admin has seen what was asked next to what would be sent.{" "}
              <Link href="/docs/approvals" className="font-medium text-white hover:underline">
                How approvals work →
              </Link>
            </>
          }
          features={[
            { icon: PencilLineIcon, title: "Edit before it ships", body: "Change the output and approve in one step. Your edits are what gets delivered." },
            { icon: SparklesIcon, title: "Rejections teach", body: "A note on a rejection becomes a style rule the next run follows." },
            { icon: FingerprintIcon, title: "Every decision on record", body: "Each approval lands in an append-only, HMAC-signed ledger your team can read." },
          ]}
        >
          <Reveal>
            <ApprovalPreview />
          </Reveal>
        </SpinePanel>

        <SpinePanel
          section={SECTIONS[3]!}
          chip="Deliver"
          title="It reaches you, or you know why."
          lede={
            <>
              Results go to your API, authenticated with your callback key, and retried if you&apos;re down. Pick a response below to see what happens next.{" "}
              <Link href="/docs/callbacks" className="font-medium text-white hover:underline">
                Build the endpoint →
              </Link>
            </>
          }
          features={[
            { icon: RepeatIcon, title: "Retried with backoff", body: "5xx, 429 and timeouts get up to three attempts. A final answer stops there." },
            { icon: BadgeCheckIcon, title: "Built to dedupe", body: "A stable delivery id survives every retry, so a repeat can't apply twice." },
            { icon: ShieldCheckIcon, title: "Careful with URLs", body: "Every address is checked on each delivery, and redirects are never followed." },
          ]}
        >
          <Reveal>
            <div className="[&>div]:my-0">
              <DeliverySimulator />
            </div>
          </Reveal>
        </SpinePanel>

        <SpinePanel
          section={SECTIONS[4]!}
          chip="Observe"
          title="Every run, priced and accounted for."
          lede={
            <>
              No credits and no opaque operations. A run&apos;s price is the model&apos;s metered cost times a simple multiplier, and you see both numbers on every run and invoice line.{" "}
              <Link href="/pricing" className="font-medium text-white hover:underline">
                See pricing →
              </Link>
            </>
          }
          features={[
            { icon: ScaleIcon, title: "Cost next to price", body: "Provider cost, markup and billed amount, on every record." },
            { icon: WalletIcon, title: "Budgets at the door", body: "Set a monthly cap per project. Once it's reached, new calls answer 402." },
            { icon: ReceiptTextIcon, title: "Invoices you can audit", body: "Monthly per project, itemized by agent, built from the same records you can read." },
          ]}
        >
          <Reveal>
            <UsagePreview />
          </Reveal>
        </SpinePanel>
      </SignalSpine>

      {/* ── Beyond one call ── */}
      <section className="mx-auto max-w-310 px-6 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Beyond a single call"
            title="Agents are the surface. The engine is the product."
            lede="The runtime under one agent call also runs pipelines, tool access and grounding, with the same metering, approvals and audit trail."
          />
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENGINE.map((e, i) => (
            <Reveal key={e.title} delay={i * 0.05}>
              <Link href={e.href} className="tile tile-link group block h-full p-4">
                <e.icon className="size-4.5 text-brand" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {e.title}
                  <ArrowRightIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{e.body}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Catalog ── */}
      <section className="mx-auto max-w-310 px-6 pb-24">
        <Reveal>
          <SectionHeading
            eyebrow="The catalog"
            title="A growing library of production agents."
            lede="Every agent is code we wrote, hardened and operate. If you need one we don't have, request it from your console and we'll build it into your catalog."
          />
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat, i) => (
            <Reveal key={cat} delay={i * 0.05}>
              <Link href="/agents" className="tile tile-link block h-full p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{CATEGORY_META[cat].label}</h3>
                  <span className="font-mono text-xs text-brand tabular-nums">{CATALOG_COUNTS[cat]}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{CATEGORY_META[cat].blurb}</p>
              </Link>
            </Reveal>
          ))}
          <Reveal delay={0.3}>
            <Link href="/agents" className="flex h-full min-h-24 items-center justify-center rounded-xl border border-dashed border-strong p-4 text-[13px] font-medium text-brand transition-colors hover:bg-surface">
              See all {MARKETING_CATALOG.length} agents
              <ArrowRightIcon className="ml-1.5 size-3.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-310 px-6 pb-24">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="The questions engineers actually ask." />
        </Reveal>
        <Reveal className="mt-10" delay={0.08}>
          <Faq items={FAQ_ITEMS} />
        </Reveal>
      </section>

      <CtaBand />
    </>
  );
}
