import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { MARKETING_CATALOG, CATEGORY_META } from "@/data/marketing-catalog";
import { Badge } from "@/components/ui/badge";
import { CtaBand } from "@/components/marketing/section";

function findAgent(slug: string) {
  return MARKETING_CATALOG.find((a) => a.agentType === slug) ?? null;
}

export function generateStaticParams() {
  return MARKETING_CATALOG.map((a) => ({ slug: a.agentType }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = findAgent(slug);
  if (!agent) return { title: "Agent not found" };
  return {
    title: `${agent.name} — ${CATEGORY_META[agent.category].label} agent`,
    description: agent.description,
    alternates: { canonical: `/agents/${agent.agentType}` },
  };
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = findAgent(slug);
  if (!agent) notFound();

  const siblings = MARKETING_CATALOG.filter(
    (a) => a.category === agent.category && a.agentType !== agent.agentType,
  );

  const callSnippet = `POST /agents/${agent.agentType}
Authorization: Bearer $SUCCOR_API_KEY
Content-Type: application/json

{ "projectId": "your-project", "requestId": "unique-per-call", ... }

→ 202 Accepted   // we run it, then POST the signed result to your callback`;

  return (
    <>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-6 md:pt-28">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          All agents
        </Link>
        <p className="mt-6 font-mono text-xs tracking-[0.2em] text-brand uppercase">
          {CATEGORY_META[agent.category].label}
        </p>
        <h1
          className="mt-3 font-serif text-foreground"
          style={{
            fontSize: "clamp(32px, 5.5vw, 52px)",
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: "-0.015em",
          }}
        >
          {agent.name}
        </h1>
        <div className="mt-4 flex items-center gap-3">
          <span className="font-mono text-xs text-faint">{agent.agentType}</span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            ~{agent.typicalMaxTokens.toLocaleString()} tok / run
          </Badge>
        </div>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{agent.description}</p>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-sm font-medium text-faint">How you call it</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          One POST from your backend with your API key — we run it and deliver a signed result to
          your callback. No polling, no model to manage.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {callSnippet}
        </pre>
      </section>

      {siblings.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="text-sm font-medium text-faint">
            More {CATEGORY_META[agent.category].label} agents
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.map((a) => (
              <Link
                key={a.agentType}
                href={`/agents/${a.agentType}`}
                className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-foreground">{a.name}</h3>
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                    ~{a.typicalMaxTokens.toLocaleString()} tok
                  </Badge>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {a.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <CtaBand />
    </>
  );
}
