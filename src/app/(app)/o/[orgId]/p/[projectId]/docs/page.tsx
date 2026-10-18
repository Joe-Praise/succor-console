"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useProjectSetup, useCatalog } from "@/features/projects/hooks";
import { CapabilityBadges } from "@/features/agents/capability-badges";
import { parseEndpoint } from "@/lib/catalog";
import type { CatalogEntry } from "@/types";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/code-block";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Join a service base URL with an endpoint path without doubling the slash. */
function joinUrl(base: string, path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

/** The id field an agent echoes back in its 202 (seoPageId, campaignId, …). */
function idFieldOf(entry: CatalogEntry | null): string | null {
  if (!entry) return null;
  return Object.keys(entry.requestExample).find((k) => /Id$/.test(k) && k !== "projectId") ?? null;
}

/** Quickstart `fetch` snippet, filled from a real enabled agent when available. */
function buildQuickstart(serviceUrl: string, projectId: string, entry: CatalogEntry | null) {
  const { method, path } = entry
    ? parseEndpoint(entry.endpoint)
    : { method: "POST", path: "/agents/<agent-type>" };
  const url = joinUrl(serviceUrl, path);
  const example = entry?.requestExample ?? { context: {} };
  const bodyLines = Object.entries(example)
    .filter(([k]) => k !== "projectId" && k !== "requestId" && k !== "initiatedBy")
    .map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`)
    .join("\n");

  return `const res = await fetch("${url}", {
  method: "${method}",
  headers: {
    "Content-Type": "application/json",
    // Mint this on the API keys tab — server-side only, never in the browser.
    Authorization: \`Bearer \${process.env.SUCCOR_API_KEY}\`,
  },
  body: JSON.stringify({
    projectId: "${projectId}",
    requestId: crypto.randomUUID(), // idempotency key — reuse it to retry safely
${bodyLines}
  }),
});

if (res.status === 202) {
  // Accepted: the run is now a durable job. Keep the id to poll or reconcile.
  const { jobId } = await res.json();
}`;
}

function build202(projectId: string, entry: CatalogEntry | null) {
  const idField = idFieldOf(entry);
  return pretty({
    accepted: true,
    jobId: "6710f3c2a9d4e81b2c0f4a17",
    projectId,
    agentType: entry?.agentType ?? "<agent-type>",
    initiatedBy: "apikey:…",
    ...(idField ? { [idField]: entry!.requestExample[idField] } : {}),
  });
}

const RESPONSES: Array<{ code: string; when: string; doThis: string }> = [
  { code: "202", when: "Accepted — the run is a durable job (body carries jobId).", doThis: "Store jobId; wait for the callback or poll." },
  { code: "200", when: "{ duplicate: true } — this requestId was already accepted.", doThis: "Nothing. The first request is already running." },
  { code: "400", when: "Body failed the agent's schema (issues lists the fields).", doThis: "Fix the payload. Not retryable." },
  { code: "401", when: "Missing, revoked or malformed API key.", doThis: "Check SUCCOR_API_KEY." },
  { code: "402", when: "The project's monthly budget cap is reached.", doThis: "Raise the cap or wait for the month to roll. Same requestId is safe to retry later." },
  { code: "403", when: "Project not active, agent not enabled or globally paused, or projectId ≠ your key's project.", doThis: "Check the project status and enablement." },
  { code: "500", when: "Couldn't enqueue (database unavailable).", doThis: "Retry with a NEW requestId." },
];

/**
 * Tenant-side callback handlers for common stacks. Each verifies the
 * `X-Succor-Callback-Key` header before trusting the payload and dedupes on
 * `X-Delivery-Id`. Static templates — no per-project data.
 */
const CALLBACK_SNIPPETS: Array<{ id: string; label: string; filename: string; code: string }> = [
  {
    id: "nextjs",
    label: "Next.js",
    filename: "app/api/admin/seo/[seoPageId]/route.ts",
    code: `import { NextRequest, NextResponse } from "next/server";

// Each agent calls a FIXED path on your base URL with a fixed method (see the
// agent cards below). Most use PUT; a few use PATCH or POST.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ seoPageId: string }> },
) {
  if (req.headers.get("x-succor-callback-key") !== process.env.SUCCOR_CALLBACK_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deliveryId = req.headers.get("x-delivery-id"); // stable across redeliveries
  const { seoPageId } = await params;
  const payload = await req.json();
  // …upsert by seoPageId (a repeat delivery is then harmless).

  return NextResponse.json({ ok: true });
}`,
  },
  {
    id: "express",
    label: "Express",
    filename: "server.js",
    code: `import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.put("/api/admin/seo/:seoPageId", (req, res) => {
  if (req.header("x-succor-callback-key") !== process.env.SUCCOR_CALLBACK_KEY) {
    return res.sendStatus(401);
  }
  const deliveryId = req.header("x-delivery-id");
  // …upsert by req.params.seoPageId.
  res.json({ ok: true });
});

app.listen(3000);`,
  },
  {
    id: "supabase",
    label: "Supabase",
    filename: "supabase/functions/agent-callback/index.ts",
    code: `// Supabase Edge Function (Deno) — route by method + path yourself.
Deno.serve(async (req) => {
  if (req.headers.get("x-succor-callback-key") !== Deno.env.get("SUCCOR_CALLBACK_KEY")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const deliveryId = req.headers.get("x-delivery-id");
  const payload = await req.json();
  // …upsert the row the URL path identifies.
  return Response.json({ ok: true });
});`,
  },
  {
    id: "fastapi",
    label: "FastAPI",
    filename: "main.py",
    code: `import os
from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI()

@app.put("/api/admin/seo/{seo_page_id}")
async def seo_callback(
    seo_page_id: str,
    request: Request,
    x_succor_callback_key: str = Header(None),
    x_delivery_id: str | None = Header(None),
):
    if x_succor_callback_key != os.environ["SUCCOR_CALLBACK_KEY"]:
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = await request.json()
    # …upsert by seo_page_id.
    return {"ok": True}`,
  },
];

function CallbackExamples() {
  const [stack, setStack] = useState(CALLBACK_SNIPPETS[0].id);
  const snip = CALLBACK_SNIPPETS.find((s) => s.id === stack) ?? CALLBACK_SNIPPETS[0];
  return (
    <div className="space-y-3">
      <Tabs value={stack} onValueChange={setStack}>
        <TabsList>
          {CALLBACK_SNIPPETS.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <CodeBlock label={snip.filename} code={snip.code} />
    </div>
  );
}

/** Per-agent request + callback reference, toggled with a segmented control. */
function AgentDocsCard({ entry, serviceUrl }: { entry: CatalogEntry; serviceUrl: string }) {
  const [tab, setTab] = useState<"request" | "callback">("request");
  const { method, path } = parseEndpoint(entry.endpoint);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="text-base">{entry.name}</CardTitle>
            <CapabilityBadges entry={entry} />
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "request" | "callback")}>
            <TabsList>
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="callback">Callback</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription className="font-mono text-xs">{entry.agentType}</CardDescription>
      </CardHeader>
      <CardContent>
        {tab === "request" ? (
          <CodeBlock label={`${method} ${joinUrl(serviceUrl, path)}`} code={pretty(entry.requestExample)} />
        ) : (
          <CodeBlock
            label={`${entry.callbackMethod} <your base URL>${entry.callbackPath}`}
            code={pretty(entry.callbackExample)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2 className="flex items-baseline gap-2 font-medium text-foreground">
        <span className="font-mono text-xs text-brand">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

const FLOW = [
  { t: "POST /agents/<type>", d: "Bearer API key + requestId" },
  { t: "202 + jobId", d: "Accepted in milliseconds" },
  { t: "Durable job", d: "Leased, checkpointed, retried" },
  { t: "Human review", d: "Only for gated agents" },
  { t: "Callback to you", d: "Signed, retried, deduplicable" },
];

export default function DocsPage() {
  const { orgId, projectId } = useProjectScope();
  const setup = useProjectSetup(projectId);
  const catalog = useCatalog(projectId);

  const enabled = (catalog.data?.catalog ?? []).filter((e) => e.enabledForProject);
  const gated = enabled.filter((e) => e.riskTier === "high");
  const serviceUrl = setup.data?.serviceUrl ?? "";
  const envBlock = setup.data
    ? Object.entries(setup.data.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    : "";
  const status = setup.data?.status;
  const sample = enabled[0] ?? null;
  const base = `/o/${orgId}/p/${projectId}`;
  const link = (href: string, label: string) => (
    <Link href={`${base}/${href}`} className="text-brand hover:underline">
      {label}
    </Link>
  );

  return (
    <div className="space-y-10">
      <PageHeader
        title="Integration guide"
        description="One authenticated POST out, one signed callback in — plus a status endpoint when you want to pull."
        action={
          setup.data ? (
            <StatusBadge
              status={(["approved", "pending", "suspended"].includes(status ?? "") ? status : "draft") as Status}
            />
          ) : undefined
        }
      />

      {status && status !== "approved" ? (
        <div className="rounded-xl border border-border bg-warning-bg px-4 py-3 text-sm text-warning">
          This project is <span className="font-medium">{status}</span>. You can wire everything up now,
          but agent calls return 403 until it&apos;s approved.
        </div>
      ) : null}

      {/* The contract in one line */}
      <ol className="grid gap-2 sm:grid-cols-5">
        {FLOW.map((f, i) => (
          <li key={f.t} className="relative rounded-xl border border-border bg-surface px-3 py-3">
            <p className="font-mono text-[11px] text-brand">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-1 font-mono text-xs text-foreground">{f.t}</p>
            <p className="text-xs text-muted-foreground">{f.d}</p>
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <Step n={1} title="Set your environment">
          Mint the API key on {link("keys", "API keys")}; the callback key was shown once at project
          creation (rotate it on {link("callbacks", "Callbacks")} if lost). Set where callbacks land on{" "}
          {link("settings", "Settings")}.
        </Step>
        {setup.isLoading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : setup.isError ? (
          <QueryError message="Couldn't load your setup." onRetry={() => void setup.refetch()} />
        ) : (
          <CodeBlock label=".env" code={envBlock} />
        )}
      </section>

      <section className="space-y-3">
        <Step n={2} title="Trigger an agent">
          POST from your server with the API key as a bearer token. Always send a unique{" "}
          <code className="font-mono text-xs">requestId</code> — replaying it returns{" "}
          <code className="font-mono text-xs">{`{ duplicate: true }`}</code> instead of a second run.
        </Step>
        {setup.isLoading ? (
          <Skeleton className="h-56 w-full rounded-lg" />
        ) : setup.isError ? (
          <QueryError message="Couldn't load your setup." onRetry={() => void setup.refetch()} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <CodeBlock label="server-side" code={buildQuickstart(serviceUrl, projectId, sample)} />
            <CodeBlock label="202 Accepted" code={build202(projectId, sample)} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <Step n={3} title="Handle every response">
          The guard chain runs in a fixed order — key ↔ project match, budget, enablement, idempotency —
          before anything is enqueued or billed.
        </Step>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-raised text-left text-xs text-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Means</th>
                <th className="px-4 py-2 font-medium">Do this</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {RESPONSES.map((r) => (
                <tr key={r.code}>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{r.code}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.when}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.doThis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <Step n={4} title="Receive the callback (push)">
          Each agent calls a fixed path on your base URL with a fixed method — usually PUT. Verify{" "}
          <code className="font-mono text-xs">X-Succor-Callback-Key</code> (legacy integrations may still
          read <code className="font-mono text-xs">X-Agent-API-Key</code> — both are sent), and dedupe on{" "}
          <code className="font-mono text-xs">X-Delivery-Id</code>. Your 5xx, 429 and timeouts are retried
          up to 3× with backoff; any other 4xx is final.
        </Step>
        <CallbackExamples />
      </section>

      <section className="space-y-3">
        <Step n={5} title="Poll the job (pull)">
          Optional, and the reconciliation path if a callback is missed. Statuses:{" "}
          <span className="font-mono text-xs">queued → running → succeeded</span>, or{" "}
          <span className="font-mono text-xs">pending_approval</span>,{" "}
          <span className="font-mono text-xs">rejected</span>,{" "}
          <span className="font-mono text-xs">dead</span>. Watch them live on {link("jobs", "Jobs")}.
        </Step>
        <CodeBlock
          label="GET /agents/jobs/:jobId"
          code={`const res = await fetch(\`${serviceUrl ? serviceUrl.replace(/\/$/, "") : "${SUCCOR_API_URL}"}/agents/jobs/\${jobId}\`, {
  headers: { Authorization: \`Bearer \${process.env.SUCCOR_API_KEY}\` },
});
const { job } = await res.json();
// job.status, job.attempt / job.maxAttempts, job.lastError, job.result`}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approval-gated agents</CardTitle>
            <CardDescription>
              {gated.length
                ? `${gated.map((g) => g.agentType).join(", ")} hold their delivery until an admin approves on Approvals. Your callback fires only after that.`
                : "None of your enabled agents are gated. High-risk agents hold their delivery for human review."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" render={<Link href={`${base}/approvals`} />}>
              Approvals <ArrowRightIcon />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shape every output</CardTitle>
            <CardDescription>
              Set your business profile once — type, voice, audience, words to use and avoid — instead of
              repeating it in every request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" render={<Link href={`${base}/profile`} />}>
              Profile <ArrowRightIcon />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Go beyond single calls</CardTitle>
            <CardDescription>
              Chain agents into durable workflows, or let tool-ready agents read from your systems over MCP.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" size="sm" render={<Link href={`${base}/workflows`} />}>
              Workflows
            </Button>
            <Button variant="outline" size="sm" render={<Link href={`${base}/tools`} />}>
              Tools
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <Step n={6} title="Your enabled agents">
          Request and callback shapes for every agent turned on for this project.
        </Step>
        {catalog.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : catalog.isError ? (
          <QueryError message="Couldn't load the catalog." onRetry={() => void catalog.refetch()} />
        ) : enabled.length === 0 ? (
          <EmptyState
            icon={BookOpenIcon}
            title="No agents enabled yet"
            description="Once an agent is enabled for this project, its request and callback examples show up here."
            action={
              <Button size="sm" variant="outline" render={<Link href={`${base}/agents`}>Browse the catalog</Link>} />
            }
          />
        ) : (
          <div className="space-y-4">
            {enabled.map((e) => (
              <AgentDocsCard key={e.agentType} entry={e} serviceUrl={serviceUrl} />
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        Prefer to try before you integrate? The {link("playground", "Playground")} runs any enabled agent
        from the browser and shows the callback it would have sent.
      </p>
    </div>
  );
}
