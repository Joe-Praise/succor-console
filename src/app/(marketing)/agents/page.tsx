import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { BRAND_NAME } from "@/lib/brand";
import {
  MARKETING_CATALOG,
  CATEGORY_META,
  CATALOG_COUNTS,
  type MarketingCategory,
} from "@/data/marketing-catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading, CtaBand } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: `Agents — ${BRAND_NAME}`,
  description: `Production agents you call through one API — operated, guarded, and metered by ${BRAND_NAME}. One integration covers every agent.`,
};

const ORDER: MarketingCategory[] = ["seo", "elearning", "analysis", "content", "vision"];

export default function AgentsPage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-6 text-center md:pt-28">
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">The agent library</p>
        <h1
          className="mt-4 font-serif text-foreground"
          style={{
            fontSize: "clamp(34px, 6vw, 56px)",
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: "-0.015em",
          }}
        >
          One integration. Every agent.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          Each one is code we wrote, hardened, and operate — schema-enforced output, guardrails,
          and a callback contract your app relies on. One integration covers every agent, and the
          library keeps growing.
        </p>
      </section>

      {ORDER.map((cat) => (
        <section key={cat} className="mx-auto max-w-6xl px-6 py-12">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow={`${CATALOG_COUNTS[cat]} agent${CATALOG_COUNTS[cat] === 1 ? "" : "s"}`}
              title={CATEGORY_META[cat].label}
              lede={CATEGORY_META[cat].blurb}
            />
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MARKETING_CATALOG.filter((a) => a.category === cat).map((a, i) => (
              <Reveal key={a.agentType} delay={i * 0.04}>
                <Link
                  href={`/agents/${a.agentType}`}
                  className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-strong"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground">{a.name}</h3>
                    <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                      ~{a.typicalMaxTokens.toLocaleString()} tok
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-faint">{a.agentType}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {a.description}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <Reveal>
          <SectionHeading
            eyebrow="Something missing?"
            title="Request the capability you actually need."
            lede="We design, build, guard, and operate custom agents, then publish them to your private catalog — metered like everything else."
          />
          <div className="mt-6">
            <Button variant="outline" render={<Link href="/contact" />}>
              Tell us what it should do
              <ArrowRightIcon />
            </Button>
          </div>
        </Reveal>
      </section>

      <CtaBand />
    </>
  );
}
