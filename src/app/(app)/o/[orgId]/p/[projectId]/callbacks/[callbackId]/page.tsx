"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCallbackDelivery } from "@/features/executions/hooks";
import { useAgentNames } from "@/features/agents/use-agent-names";
import { dateTime, duration } from "@/lib/format";
import { DetailPage, renderDetailState } from "@/components/ops/detail-page";
import { Callout, Section } from "@/components/ops/primitives";
import { CodeBlock } from "@/components/code-block";

/** What a status code means for THIS delivery engine (4F temporal classes). */
function classify(status: number | null, ok: boolean): { tone: "success" | "warning" | "error"; title: string; body: string } {
  if (ok) return { tone: "success", title: "Accepted", body: "Your endpoint answered 2xx, so this attempt counted as delivered." };
  if (status === null) {
    return {
      tone: "warning",
      title: "No response",
      body: "Network error or the 30 s timeout. Retried with backoff — and if the request may have been sent, the outcome is treated as unknown.",
    };
  }
  if (status === 429 || status >= 500) {
    return { tone: "warning", title: `HTTP ${status} — retryable`, body: "Treated as transient and retried with backoff (up to 3 attempts)." };
  }
  return {
    tone: "error",
    title: `HTTP ${status} — not retried`,
    body:
      status === 401 || status === 403
        ? "Your endpoint refused the credentials. Check it verifies X-Succor-Callback-Key against the CURRENT callback key (rotation replaces it immediately)."
        : status === 404 || status === 405
          ? "Your endpoint doesn't serve this method + path. Each agent calls a fixed path on your base URL — see its callback contract."
          : "A 4xx is treated as permanent: the same request will never succeed, so it isn't retried.",
  };
}

export default function CallbackDeliveryPage() {
  const { orgId, projectId } = useProjectScope();
  const { callbackId } = useParams<{ callbackId: string }>();
  const q = useCallbackDelivery(projectId, callbackId);
  const { nameOf } = useAgentNames(projectId);
  const base = `/o/${orgId}/p/${projectId}`;

  const state = renderDetailState({ query: q, backHref: `${base}/callbacks`, backLabel: "All callbacks", noun: "delivery" });
  if (state || !q.data) return state;
  const d = q.data.delivery;
  const c = classify(d.responseStatus, d.ok);
  const id = d.id ?? d._id ?? callbackId;

  return (
    <DetailPage
      breadcrumbs={[{ label: "Callbacks", href: `${base}/callbacks` }, { label: id.slice(-8) }]}
      eyebrow="Callback delivery attempt"
      title={`${d.method} ${new URL(d.url, "http://x").pathname}`}
      id={id}
      facts={[
        { label: "Sent", value: dateTime(d.ts) },
        { label: "Agent", value: nameOf(d.agentType) },
        { label: "Environment", value: d.envLabel },
        { label: "Duration", value: duration(d.durationMs) },
      ]}
      aside={
        <div className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Related</p>
          <Link href={`${base}/callbacks?agent=${d.agentType}`} className="block text-brand hover:underline">
            Other deliveries for this agent
          </Link>
          <Link href={`${base}/runs?agent=${d.agentType}`} className="block text-brand hover:underline">
            Runs of this agent
          </Link>
          <Link href={`${base}/agents/${d.agentType}`} className="block text-brand hover:underline">
            Its callback contract
          </Link>
          <Link href={`${base}/settings`} className="block text-brand hover:underline">
            Callback base URLs
          </Link>
          <p className="border-t border-border pt-2 text-xs text-faint">
            This attempt isn&apos;t linked to a specific run yet — the delivery log doesn&apos;t record the job id.
          </p>
        </div>
      }
    >
      <Callout tone={c.tone} title={c.title}>
        {c.body}
      </Callout>

      <Section title="Request">
        <CodeBlock
          label="as sent"
          code={`${d.method} ${d.url}
X-Succor-Callback-Key: cbk_••••••••
X-Agent-API-Key: cbk_••••••••
X-Delivery-Id: <jobId>:<effectKey>   (durable deliveries)
Content-Type: application/json`}
        />
        <p className="text-xs text-faint">
          Header values are shown masked — the callback key is never displayed. The body is the run&apos;s result; open
          the run to see it.
        </p>
      </Section>

      <Section title="Response">
        <div className="rounded-xl border border-border bg-surface p-4 font-mono text-sm">
          <p>
            <span className="text-faint">status </span>
            <span className={d.ok ? "text-success" : "text-error"}>{d.responseStatus ?? "no response"}</span>
          </p>
          {d.errorMessage ? <p className="mt-2 text-xs wrap-break-word text-muted-foreground">{d.errorMessage}</p> : null}
        </div>
      </Section>
    </DetailPage>
  );
}
