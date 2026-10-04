import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading, CtaBand, Faq } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: `Pricing — ${BRAND_NAME}`,
  description:
    "No seats. No platform fee. No credit packs. Pay the provider's metered cost times a simple multiplier — and audit both numbers on every run.",
};

const INCLUDED = [
  "Unlimited team members",
  "Unlimited projects",
  "Usage analytics & per-run receipts",
  "Hard budget caps (agents stop at the limit)",
  "In-browser playground",
  "Callback delivery logs",
  "Itemized monthly invoices",
  "Support",
];

const EXAMPLES = [
  { agent: "auto-tagger", kind: "Light run", tokens: "~500 tokens", price: "well under a cent" },
  { agent: "quiz-generator", kind: "Medium run", tokens: "~1,500 tokens", price: "about a cent" },
  { agent: "seo-page-factory", kind: "Heavy run", tokens: "~4,000 tokens", price: "a few cents" },
];

const FAQ_ITEMS = [
  {
    q: "Why cost-plus instead of credits?",
    a: "Credits hide the real price of a run behind an exchange rate you can't audit. Cost-plus keeps it honest: the model's metered cost, a simple multiplier, and both numbers on every run and invoice line.",
  },
  {
    q: "Do failed runs cost money?",
    a: "Only tokens actually consumed are metered. A run that fails before reaching the model costs nothing; a retried call with the same requestId is deduplicated and never double-billed.",
  },
  {
    q: "Can I cap spend per project?",
    a: "Yes — set a monthly budget cap per project. At the limit, agent calls return 402 and stop spending until the month resets or you raise the cap. It's a wall, not a warning.",
  },
  {
    q: "Do you offer volume discounts?",
    a: "Multipliers are adjustable per project. If you're running serious volume, talk to us and we'll set a rate that makes sense.",
  },
  {
    q: "What currency are invoices in?",
    a: "USD today. Card payments and local-currency options are on the roadmap; bank transfer works everywhere now.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-14 text-center md:pt-28">
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">Pricing</p>
        <h1
          className="mt-4 font-serif text-foreground"
          style={{
            fontSize: "clamp(34px, 6vw, 56px)",
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: "-0.015em",
          }}
        >
          Pay for what runs. Audit every run.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          No seats. No platform fee. No credit packs. A run&apos;s price is the provider&apos;s
          metered cost × a simple multiplier — and you always see both numbers.
        </p>
        <div className="mt-8">
          <Button size="lg" render={<Link href="/register" />}>
            Start free
            <ArrowRightIcon />
          </Button>
        </div>
      </section>

      {/* How a run is priced */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <SectionHeading
              eyebrow="The formula"
              title="How a run is priced"
              lede="Simple enough to hold in your head, honest enough to put on an invoice."
            />
          </Reveal>
          <Reveal className="mx-auto mt-10 max-w-3xl" delay={0.08}>
            <div className="overflow-x-auto rounded-xl border border-border bg-background p-6 text-center font-mono text-sm text-muted-foreground">
              tokens in/out <span className="text-faint">→</span> model rate{" "}
              <span className="text-faint">→</span> raw cost <span className="text-faint">→</span>{" "}
              <span className="text-brand">× multiplier</span> <span className="text-faint">→</span>{" "}
              <span className="text-foreground">your price</span>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {EXAMPLES.map((e, i) => (
              <Reveal key={e.agent} delay={i * 0.06}>
                <div className="h-full rounded-xl border border-border bg-background p-5 text-center">
                  <p className="text-xs font-medium tracking-wide text-faint uppercase">{e.kind}</p>
                  <p className="mt-2 font-mono text-sm text-foreground">{e.agent}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.tokens}</p>
                  <p className="mt-3 text-sm font-medium text-brand">{e.price}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-faint">
            Illustrative, based on typical token usage — your dashboard shows exact figures per run.
          </p>
        </div>
      </section>

      {/* Included */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Included"
            title="Everything, with every organization"
            lede="The platform is the product — you only ever pay for usage."
          />
        </Reveal>
        <Reveal className="mx-auto mt-10 max-w-2xl" delay={0.08}>
          <ul className="grid gap-3 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* Invoices & payment + managed dev */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-xl border border-border bg-background p-6">
              <h3 className="font-medium text-foreground">Invoices & payment</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Invoices are issued monthly, per project, itemized by agent. Pay each project
                individually by bank transfer — card payments are coming. Your org owner
                submits the reference; we confirm, you&apos;re done.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-xl border border-border bg-background p-6">
              <h3 className="font-medium text-foreground">Managed agent development</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Need an agent that doesn&apos;t exist yet? Scoped, flat build fee; then normal
                usage pricing once it&apos;s live in your catalog.{" "}
                <Link href="/contact" className="text-brand hover:underline">
                  Talk to us
                </Link>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Fair questions about money." />
        </Reveal>
        <Reveal className="mt-10" delay={0.08}>
          <Faq items={FAQ_ITEMS} />
        </Reveal>
      </section>

      <CtaBand />
    </>
  );
}
