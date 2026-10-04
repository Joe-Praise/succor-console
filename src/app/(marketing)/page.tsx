import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  KeyRoundIcon,
  WebhookIcon,
  UsersIcon,
  PackagePlusIcon,
} from "lucide-react";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { CATEGORY_META, CATALOG_COUNTS, MARKETING_CATALOG } from "@/data/marketing-catalog";
import { Button } from "@/components/ui/button";
import { LifecycleDiagram } from "@/components/marketing/lifecycle-diagram";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading, CtaBand, Faq } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — production agents, workflows & automation`,
  description: BRAND_TAGLINE,
};

const PROBLEMS = [
  {
    title: "The hidden backlog",
    body: "The feature is 10% idea, 90% machinery: integration, output validation, retries, guardrails, usage accounting. None of it ships value on its own — all of it has to exist.",
  },
  {
    title: "The runaway bill",
    body: "One looping job or one busy tenant can burn a month's budget overnight. You need hard caps and per-run receipts, not a dashboard you check after the damage.",
  },
  {
    title: "The maintenance tax",
    body: "Providers change. Outputs drift. Formats break at 2 a.m. Someone owns that forever — and it shouldn't be your product team.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create a project",
    body: "Get two scoped keys: one to call us, one that signs our calls back to you. Shown once, hashed at rest, revocable instantly.",
    code: `SUCCOR_API_KEY=ask_live_••••••••\nSUCCOR_CALLBACK_KEY=cbk_••••••••`,
  },
  {
    n: "02",
    title: "Call an agent",
    body: "POST /agents/<type> with your payload and an idempotency requestId. We answer 202 in milliseconds and get to work.",
    code: `curl -X POST $SERVICE/agents/quiz-generator \\\n  -H "Authorization: Bearer $KEY" \\\n  -d '{ "projectId": "my-app", "requestId": "run-19" }'\n\n→ 202 Accepted`,
  },
  {
    n: "03",
    title: "Receive the result",
    body: "The agent delivers validated output to your callback endpoint, signed with your key. Your app never polls.",
    code: `PUT /api/agent-callback\nX-Succor-Callback-Key: cbk_••••••••\n\n{ "quiz": [ … ], "agent_initiated": true }`,
  },
];

const DIFFERENTIATORS = [
  {
    icon: ReceiptTextIcon,
    title: "Billing you can audit",
    body: "Every run shows the raw provider cost and your billed price, side by side. The same numbers appear on your invoice.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Budget caps that actually cap",
    body: "Set a monthly cap per project. At the limit, agents return 402 and stop spending. Not an alert — a wall.",
  },
  {
    icon: KeyRoundIcon,
    title: "Keys done right",
    body: "Project-scoped, shown once, SHA-256-hashed at rest, revocable in one click.",
  },
  {
    icon: WebhookIcon,
    title: "A callback, not a queue to babysit",
    body: "Fire-and-forget 202; signed results arrive at your endpoint. Retried calls never double-bill, thanks to idempotency keys.",
  },
  {
    icon: UsersIcon,
    title: "Your team, correctly scoped",
    body: "Organizations with Owner, Admin, and Developer roles. Developers ship features; they can't leak a secret.",
  },
  {
    icon: PackagePlusIcon,
    title: "Agents on request",
    body: "Need a capability we don't have? We design, build, guard, and operate it — then publish it to your private catalog.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Do we manage models or infrastructure?",
    a: "No — you never touch a model, a provider account, a prompt, or a server. You call the agent; we operate everything behind it, and the contract stays stable even as what's under the hood improves.",
  },
  {
    q: "What happens when an agent fails mid-run?",
    a: "Failures are recorded with the error, and only tokens actually consumed are metered. Retried calls carrying the same requestId are deduplicated, so a retry never double-bills you.",
  },
  {
    q: "Is my data used to train anything?",
    a: "No. Your payloads are used to fulfil your run — nothing else. Runs, outputs, and callbacks stay inside your project.",
  },
  {
    q: "How long does integration take?",
    a: "One POST plus one callback endpoint — teams typically ship their first automation in a day. The docs include copy-paste boilerplate for both sides.",
  },
  {
    q: "How does billing work?",
    a: "Cost-plus: a run's price is the model's metered cost times a simple multiplier. You see both numbers on every run, and invoices are issued monthly per project, itemized by agent.",
  },
  {
    q: "Can I get a custom agent?",
    a: "Yes — request one from your dashboard. We scope it with you, build and validate it, wrap it in the same guardrails as everything else, and ship it to your catalog.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center md:pt-28">
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">
          Agents, workflows &amp; automation
        </p>
        <h1
          className="mx-auto mt-4 max-w-3xl font-serif text-foreground"
          style={{
            fontSize: "clamp(36px, 6.5vw, 64px)",
            lineHeight: 1.08,
            fontWeight: 500,
            letterSpacing: "-0.015em",
          }}
        >
          Production agents for your product. Metered, billed, done.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          {BRAND_NAME} puts a growing library of production agents behind one API. Your app
          makes one call — we run the work, validate the output, meter every token, and deliver
          the result to your callback. You ship the feature; we run the machinery — agents
          today, workflows, integrations, and automation next.
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

        <div className="mt-14">
          <LifecycleDiagram />
        </div>

        {/* Trust bar */}
        <p className="mt-10 text-sm text-faint">
          One engine, already running in production behind live products.
        </p>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <SectionHeading
              eyebrow="The gap"
              title="Every roadmap has automation work no one wants to own."
            />
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="h-full rounded-xl border border-border bg-background p-6">
                  <h3 className="font-medium text-foreground">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <p className="font-serif text-xl text-foreground italic md:text-2xl">
              {BRAND_NAME} owns the machinery. You own the feature.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Integration"
            title="One call out. One callback in. That's the whole integration."
          />
        </Reveal>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-6">
                <p className="font-mono text-xs text-brand">{s.n}</p>
                <h3 className="mt-2 font-medium text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                <pre className="mt-4 flex-1 overflow-x-auto rounded-lg border border-border bg-background p-3.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {s.code}
                </pre>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Catalog ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <SectionHeading
              eyebrow="The catalog"
              title="A growing library of production agents."
              lede="Every agent is code we wrote, hardened, and operate: schema-enforced output, injection guardrails, and a callback contract your app can rely on. New agents land without you touching a thing."
            />
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat, i) => (
              <Reveal key={cat} delay={i * 0.06}>
                <Link
                  href="/agents"
                  className="block h-full rounded-xl border border-border bg-background p-6 transition-colors hover:border-strong"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium text-foreground">{CATEGORY_META[cat].label}</h3>
                    <span className="font-mono text-sm text-brand">{CATALOG_COUNTS[cat]}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {CATEGORY_META[cat].blurb}
                  </p>
                </Link>
              </Reveal>
            ))}
            <Reveal delay={0.3}>
              <Link
                href="/agents"
                className="flex h-full items-center justify-center rounded-xl border border-dashed border-strong p-6 text-sm font-medium text-brand hover:bg-background"
              >
                See all {MARKETING_CATALOG.length} agents
                <ArrowRightIcon className="ml-1.5 size-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Differentiators ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading eyebrow="Why us" title="Built like infrastructure, because it is." />
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((d, i) => (
            <Reveal key={d.title} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-border bg-surface p-6">
                <d.icon className="size-5 text-brand" aria-hidden />
                <h3 className="mt-3 font-medium text-foreground">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Billing transparency ─────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="Pricing"
              title="Cost-plus, with the receipt attached."
              lede="No credit systems. No opaque “operations.” A run's price is the model's metered cost times a simple multiplier — and your dashboard shows both numbers on every single run and every invoice line. If you can't audit it, you shouldn't be paying for it."
            />
            <div className="mt-6">
              <Button variant="outline" render={<Link href="/pricing" />}>
                See how pricing works
                <ArrowRightIcon />
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-faint">
                    <th className="pb-2 font-normal">agent</th>
                    <th className="pb-2 text-right font-normal">tokens</th>
                    <th className="pb-2 text-right font-normal">cost</th>
                    <th className="pb-2 text-right font-normal">billed</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="py-1">seo-page-factory</td>
                    <td className="py-1 text-right">3,912</td>
                    <td className="py-1 text-right">$0.0104</td>
                    <td className="py-1 text-right text-foreground">$0.0312</td>
                  </tr>
                  <tr>
                    <td className="py-1">quiz-generator</td>
                    <td className="py-1 text-right">1,204</td>
                    <td className="py-1 text-right">$0.0031</td>
                    <td className="py-1 text-right text-foreground">$0.0093</td>
                  </tr>
                  <tr>
                    <td className="py-1">visual-tagger</td>
                    <td className="py-1 text-right">688</td>
                    <td className="py-1 text-right">$0.0019</td>
                    <td className="py-1 text-right text-foreground">$0.0057</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-[10px] text-faint">
                Illustrative figures — your dashboard shows exact numbers per run.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Teams ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading
            eyebrow="For teams"
            title="Built for organizations, not just accounts."
            lede="Create an organization, invite your team, and keep roles honest: Owners handle billing and membership, Admins run projects and keys, Developers build without ever touching a secret. Every project gets its own keys, its own budget cap, and its own invoice — pay for exactly the project you choose, when you choose."
          />
        </Reveal>
      </section>

      {/* ── Managed agents ───────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Reveal>
            <SectionHeading
              eyebrow="Managed agent development"
              title="The catalog is the start, not the ceiling."
              lede="Tell us what you need the agent to do and what your callback should receive. We scope it with you, build and validate it, wrap it in the same guardrails as everything else, and ship it to your catalog — metered like any other agent. A bespoke capability, without the hire."
            />
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
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
