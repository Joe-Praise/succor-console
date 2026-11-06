import type { CallbackDelivery, CatalogEntry, RunRow } from "@/types";
import { parseEndpoint } from "@/lib/catalog";

/**
 * One timeline of HTTP traffic, built from two records the backend actually keeps:
 *   in  — a request it ACCEPTED (a job row exists only after the guard chain passes)
 *   out — one callback attempt to the tenant's API
 *
 * A request refused before enqueue (400, 401, 402, 403) leaves no record, so it can't be
 * shown. Jobs a workflow spawned never came in over HTTP and are labelled as such.
 */

export type RequestDirection = "in" | "out";

interface StreamBase {
  key: string;
  ts: Date;
  agentType: string;
}

export interface InboundEvent extends StreamBase {
  direction: "in";
  run: RunRow;
  /** False for a job a workflow spawned: there was no inbound HTTP request. */
  http: boolean;
  method: string;
  path: string;
}

export interface OutboundEvent extends StreamBase {
  direction: "out";
  delivery: CallbackDelivery;
  id: string;
  method: string;
  path: string;
  host: string;
}

export type StreamEvent = InboundEvent | OutboundEvent;

function splitUrl(url: string): { host: string; path: string } {
  try {
    const u = new URL(url);
    return { host: u.host, path: u.pathname };
  } catch {
    return { host: "", path: url };
  }
}

export function buildStream(runs: RunRow[], callbacks: CallbackDelivery[], catalog: CatalogEntry[]): StreamEvent[] {
  const endpoints = new Map(catalog.map((c) => [c.agentType, parseEndpoint(c.endpoint)]));
  const inbound: InboundEvent[] = runs.map((run) => {
    const ep = endpoints.get(run.agentType);
    return {
      direction: "in",
      key: `in:${run.id}`,
      ts: run.createdAt,
      agentType: run.agentType,
      run,
      http: !run.workflowId,
      method: ep?.method ?? "POST",
      path: ep?.path ?? `/agents/${run.agentType}`,
    };
  });
  const outbound: OutboundEvent[] = callbacks.map((delivery, i) => {
    const id = delivery.id ?? delivery._id ?? "";
    const { host, path } = splitUrl(delivery.url);
    return {
      direction: "out",
      key: `out:${id || i}`,
      id,
      ts: delivery.ts,
      agentType: delivery.agentType,
      delivery,
      method: delivery.method,
      path,
      host,
    };
  });
  return [...inbound, ...outbound].sort((a, b) => b.ts.getTime() - a.ts.getTime());
}

export interface StreamFilter {
  direction: RequestDirection | "";
  agent: string;
  result: "ok" | "failed" | "";
  query: string;
}

function isFailure(e: StreamEvent): boolean {
  return e.direction === "out" ? !e.delivery.ok : e.run.status === "dead" || e.run.status === "rejected";
}

export function filterStream(events: StreamEvent[], f: StreamFilter): StreamEvent[] {
  const q = f.query.trim().toLowerCase();
  return events.filter((e) => {
    if (f.direction && e.direction !== f.direction) return false;
    if (f.agent && e.agentType !== f.agent) return false;
    if (f.result === "failed" && !isFailure(e)) return false;
    if (f.result === "ok" && isFailure(e)) return false;
    if (q) {
      const hay = [e.path, e.agentType, e.direction === "in" ? `${e.run.id} ${e.run.requestId ?? ""}` : `${e.host} ${e.delivery.url}`]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
