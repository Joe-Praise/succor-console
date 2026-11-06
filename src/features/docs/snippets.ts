import { parseEndpoint } from "@/lib/catalog";
import type { CatalogEntry } from "@/types";

/**
 * Generates the request snippets from an agent's real contract, so an example can't drift
 * from what the agent accepts. Keys stay as environment references: docs never hold a secret.
 */

export type SnippetLang = "curl" | "node" | "python";

export const SNIPPET_LANGS: Array<{ id: SnippetLang; label: string }> = [
  { id: "curl", label: "cURL" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
];

export function joinUrl(base: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** The body to send: the agent's example, for this project. The server derives initiatedBy. */
export function buildBody(entry: CatalogEntry, projectId: string, requestId = "run-001"): Record<string, unknown> {
  const { projectId: _p, initiatedBy: _i, requestId: _r, ...rest } = entry.requestExample;
  return { projectId, requestId, ...rest };
}

function jsonIndented(value: unknown, pad: string): string {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((l, i) => (i === 0 ? l : pad + l))
    .join("\n");
}

function pythonLiteral(value: unknown, pad: string): string {
  return jsonIndented(value, pad)
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None");
}

export function requestSnippet(lang: SnippetLang, serviceUrl: string, entry: CatalogEntry, body: unknown): string {
  const { method, path } = parseEndpoint(entry.endpoint);
  const url = joinUrl(serviceUrl, path);
  switch (lang) {
    case "curl":
      return `curl -X ${method} ${url} \\
  -H "Authorization: Bearer $SUCCOR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`;
    case "node":
      return `const res = await fetch("${url}", {
  method: "${method}",
  headers: {
    Authorization: \`Bearer \${process.env.SUCCOR_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${jsonIndented(body, "  ")}),
});

if (res.status === 202) {
  const { jobId } = await res.json(); // keep it to poll or reconcile
}`;
    case "python":
      return `import os
import requests

res = requests.${method.toLowerCase()}(
    "${url}",
    headers={"Authorization": f"Bearer {os.environ['SUCCOR_API_KEY']}"},
    json=${pythonLiteral(body, "    ")},
    timeout=10,
)

if res.status_code == 202:
    job_id = res.json()["jobId"]  # keep it to poll or reconcile`;
  }
}

export function pollSnippet(lang: SnippetLang, serviceUrl: string): string {
  const url = joinUrl(serviceUrl, "/agents/jobs");
  switch (lang) {
    case "curl":
      return `curl ${url}/$JOB_ID \\
  -H "Authorization: Bearer $SUCCOR_API_KEY"`;
    case "node":
      return `const res = await fetch(\`${url}/\${jobId}\`, {
  headers: { Authorization: \`Bearer \${process.env.SUCCOR_API_KEY}\` },
});
const { job } = await res.json();
// job.status, job.runStatus, job.attempt, job.maxAttempts, job.lastError, job.result`;
    case "python":
      return `res = requests.get(
    f"${url}/{job_id}",
    headers={"Authorization": f"Bearer {os.environ['SUCCOR_API_KEY']}"},
    timeout=10,
)
job = res.json()["job"]  # status, runStatus, attempt, maxAttempts, lastError, result`;
  }
}

/** The id field an agent echoes back in its 202 (seoPageId, courseId, …), if any. */
export function idFieldOf(entry: CatalogEntry): string | null {
  return Object.keys(entry.requestExample).find((k) => /Id$/.test(k) && k !== "projectId" && k !== "requestId") ?? null;
}

export function accepted202(entry: CatalogEntry, projectId: string, body?: Record<string, unknown>): Record<string, unknown> {
  const idField = idFieldOf(entry);
  const source = body ?? entry.requestExample;
  return {
    accepted: true,
    jobId: "6710f3c2a9d4e81b2c0f4a17",
    projectId,
    agentType: entry.agentType,
    initiatedBy: "apikey:<key id>",
    ...(idField && source[idField] !== undefined ? { [idField]: source[idField] } : {}),
  };
}

/** Fill :params in a callback path from the request body, so the example reads as a real URL. */
export function callbackUrlFor(entry: CatalogEntry, body?: Record<string, unknown>): string {
  return entry.callbackPath.replace(/:([a-zA-Z]+)/g, (whole, name: string) => {
    const v = (body ?? entry.requestExample)[name];
    return v === undefined || v === null ? whole : String(v);
  });
}

export type HandlerStack = "nextjs" | "express" | "fastapi" | "supabase";

export const HANDLER_STACKS: Array<{ id: HandlerStack; label: string; filename: string }> = [
  { id: "nextjs", label: "Next.js", filename: "route.ts" },
  { id: "express", label: "Express", filename: "server.js" },
  { id: "fastapi", label: "FastAPI", filename: "main.py" },
  { id: "supabase", label: "Supabase", filename: "index.ts" },
];

/** A callback handler for one agent's real method and path. Verifies, dedupes, answers 2xx. */
export function handlerSnippet(stack: HandlerStack, entry: CatalogEntry): string {
  const method = entry.callbackMethod;
  const path = entry.callbackPath;
  switch (stack) {
    case "nextjs":
      return `// app${path.replace(/:([a-zA-Z]+)/g, "[$1]")}/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function ${method}(req: NextRequest) {
  if (req.headers.get("x-succor-callback-key") !== process.env.SUCCOR_CALLBACK_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stable across retries of one delivery. Store it and skip if you've seen it.
  const deliveryId = req.headers.get("x-delivery-id");
  const payload = await req.json();

  // Upsert by the id in the path, so a repeat delivery is harmless.
  return NextResponse.json({ ok: true });
}`;
    case "express":
      return `import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.${method.toLowerCase()}("${path}", (req, res) => {
  if (req.header("x-succor-callback-key") !== process.env.SUCCOR_CALLBACK_KEY) {
    return res.sendStatus(401);
  }

  // Stable across retries of one delivery. Store it and skip if you've seen it.
  const deliveryId = req.header("x-delivery-id");

  // Upsert by the id in the path, so a repeat delivery is harmless.
  res.json({ ok: true });
});`;
    case "fastapi":
      return `import os
from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI()

@app.${method.toLowerCase()}("${path.replace(/:([a-zA-Z]+)/g, "{$1}")}")
async def callback(
    request: Request,
    x_succor_callback_key: str | None = Header(None),
    x_delivery_id: str | None = Header(None),  # stable across retries: dedupe on it
):
    if x_succor_callback_key != os.environ["SUCCOR_CALLBACK_KEY"]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload = await request.json()
    # Upsert by the id in the path, so a repeat delivery is harmless.
    return {"ok": True}`;
    case "supabase":
      return `// supabase/functions/agent-callback/index.ts (route by method + path yourself)
Deno.serve(async (req) => {
  if (req.headers.get("x-succor-callback-key") !== Deno.env.get("SUCCOR_CALLBACK_KEY")) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Stable across retries of one delivery. Store it and skip if you've seen it.
  const deliveryId = req.headers.get("x-delivery-id");
  const payload = await req.json();

  // Upsert the row the path identifies, so a repeat delivery is harmless.
  return Response.json({ ok: true });
});`;
  }
}
