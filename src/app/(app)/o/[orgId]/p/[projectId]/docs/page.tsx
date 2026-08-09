"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useProjectSetup, useCatalog } from "@/features/projects/hooks";
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

/** Quickstart `fetch` snippet, filled from a real enabled agent when available. */
function buildQuickstart(serviceUrl: string, projectId: string, entry: CatalogEntry | null) {
  const { method, path } = entry
    ? parseEndpoint(entry.endpoint)
    : { method: "POST", path: "/agents/<agent-type>" };
  const url = joinUrl(serviceUrl, path);
  const example = entry?.requestExample ?? { input: "…" };
  const bodyLines = Object.entries(example)
    .filter(([k]) => k !== "projectId" && k !== "requestId")
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

// The agent runs asynchronously and POSTs the result to your callback URL.
const { runId } = await res.json();`;
}

/**
 * Tenant-side callback handlers for common stacks. Each verifies the
 * `X-Succor-Callback-Key` header against the callback key before trusting the
 * payload. Static templates — no per-project data.
 */
const CALLBACK_SNIPPETS: Array<{ id: string; label: string; filename: string; code: string }> = [
  {
    id: "nextjs",
    label: "Next.js",
    filename: "app/api/agent-callback/route.ts",
    code: `import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // The agent presents your callback key in this header — verify it first.
  if (req.headers.get("x-succor-callback-key") !== process.env.SUCCOR_CALLBACK_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  // …persist the finished run for the matching requestId / runId.

  return NextResponse.json({ ok: true });
}`,
  },
  {
    id: "express",
    label: "Express",
    filename: "server.js",
    code: `import express from "express";

const app = express();
app.use(express.json());

app.post("/agent-callback", (req, res) => {
  if (req.header("x-succor-callback-key") !== process.env.SUCCOR_CALLBACK_KEY) {
    return res.sendStatus(401);
  }

  const payload = req.body;
  // …persist the finished run for the matching requestId / runId.

  res.json({ ok: true });
});

app.listen(3000);`,
  },
  {
    id: "supabase",
    label: "Supabase",
    filename: "supabase/functions/agent-callback/index.ts",
    code: `// Supabase Edge Function (Deno).
Deno.serve(async (req) => {
  if (req.headers.get("x-succor-callback-key") !== Deno.env.get("SUCCOR_CALLBACK_KEY")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();
  // …persist the finished run for the matching requestId / runId.

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

@app.post("/agent-callback")
async def agent_callback(request: Request, x_succor_callback_key: str = Header(None)):
    if x_succor_callback_key != os.environ["SUCCOR_CALLBACK_KEY"]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = await request.json()
    # …persist the finished run for the matching requestId / runId.

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
          <CardTitle className="text-base">{entry.name}</CardTitle>
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
          <CodeBlock
            label={`${method} ${joinUrl(serviceUrl, path)}`}
            code={pretty(entry.requestExample)}
          />
        ) : (
          <CodeBlock
            label={`${entry.callbackMethod} <your-app>${entry.callbackPath}`}
            code={pretty(entry.callbackExample)}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function DocsPage() {
  const { orgId, projectId } = useProjectScope();
  const setup = useProjectSetup(projectId);
  const catalog = useCatalog(projectId);

  const enabled = (catalog.data?.catalog ?? []).filter((e) => e.enabledForProject);
  const serviceUrl = setup.data?.serviceUrl ?? "";
  const envBlock = setup.data
    ? Object.entries(setup.data.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n")
    : "";
  const status = setup.data?.status;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integration guide"
        description="Wire your backend to this project — copy the env, trigger an agent, receive the callback."
        action={
          setup.data ? (
            <StatusBadge
              status={
                (["approved", "pending", "suspended"].includes(status ?? "")
                  ? status
                  : "draft") as Status
              }
            />
          ) : undefined
        }
      />

      {status && status !== "approved" ? (
        <div className="rounded-xl border border-border bg-warning-bg px-4 py-3 text-sm text-warning">
          This project is <span className="font-medium">{status}</span>. You can wire everything up
          now, but agent calls stay blocked until it&apos;s approved.
        </div>
      ) : null}

      {/* 1 — Environment */}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium text-foreground">1. Set your environment</h2>
          <p className="text-sm text-muted-foreground">
            Drop these into your backend. Mint the API key on the{" "}
            <Link href={`/o/${orgId}/p/${projectId}/keys`} className="text-brand hover:underline">
              API keys
            </Link>{" "}
            tab; the callback key was shown once at project creation (rotate it on{" "}
            <Link
              href={`/o/${orgId}/p/${projectId}/callbacks`}
              className="text-brand hover:underline"
            >
              Callbacks
            </Link>{" "}
            if lost).
          </p>
        </div>
        {setup.isLoading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : setup.isError ? (
          <QueryError message="Couldn't load your setup." onRetry={() => void setup.refetch()} />
        ) : (
          <CodeBlock label=".env" code={envBlock} />
        )}
      </section>

      {/* 2 — Trigger an agent */}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium text-foreground">2. Trigger an agent</h2>
          <p className="text-sm text-muted-foreground">
            POST from your server with the API key as a bearer token. Always send a unique{" "}
            <code className="font-mono text-xs">requestId</code> so retries stay idempotent.
          </p>
        </div>
        {setup.isLoading ? (
          <Skeleton className="h-56 w-full rounded-lg" />
        ) : setup.isError ? (
          <QueryError message="Couldn't load your setup." onRetry={() => void setup.refetch()} />
        ) : (
          <CodeBlock
            label="server-side"
            code={buildQuickstart(serviceUrl, projectId, enabled[0] ?? null)}
          />
        )}
      </section>

      {/* 3 — Receive the callback */}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium text-foreground">3. Receive the callback</h2>
          <p className="text-sm text-muted-foreground">
            The agent runs asynchronously and calls your endpoint when it&apos;s done. Verify the{" "}
            <code className="font-mono text-xs">X-Succor-Callback-Key</code> header against your
            callback key before trusting any payload.
          </p>
        </div>
        <CallbackExamples />
      </section>

      {/* 4 — Per-agent examples */}
      <section className="space-y-3">
        <div>
          <h2 className="font-medium text-foreground">4. Your enabled agents</h2>
          <p className="text-sm text-muted-foreground">
            Request and callback shapes for every agent turned on for this project.
          </p>
        </div>
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
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/o/${orgId}/p/${projectId}/agents`}>Browse the catalog</Link>}
              />
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
        Prefer to try before you integrate? Use the{" "}
        <Link href={`/o/${orgId}/p/${projectId}/playground`} className="text-brand hover:underline">
          Playground
        </Link>{" "}
        to run any enabled agent from the browser.
      </p>
    </div>
  );
}
