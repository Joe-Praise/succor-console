import { describe, expect, it } from "vitest";

import type { CallbackDelivery, CatalogEntry, RunRow } from "@/types";
import { buildStream, filterStream, type StreamFilter } from "./stream";

const run = (over: Partial<RunRow>): RunRow => ({
  id: "job1",
  agentType: "quiz-generator",
  status: "succeeded",
  runStatus: "success",
  attempt: 1,
  maxAttempts: 1,
  requestId: "req-1",
  workflowId: null,
  initiatedBy: "apikey:abc",
  lastError: null,
  createdAt: new Date("2026-11-06T10:00:00Z"),
  updatedAt: new Date("2026-11-06T10:01:00Z"),
  ...over,
});

const delivery = (over: Partial<CallbackDelivery>): CallbackDelivery => ({
  id: "cb1",
  ts: new Date("2026-11-06T10:02:00Z"),
  agentType: "quiz-generator",
  method: "PUT",
  url: "https://api.example.test/api/v1/quiz?secret=1",
  envLabel: "production",
  responseStatus: 200,
  ok: true,
  durationMs: 120,
  ...over,
});

const catalog = [{ agentType: "quiz-generator", endpoint: "POST /agents/quiz-generator" }] as unknown as CatalogEntry[];
const none: StreamFilter = { direction: "", agent: "", result: "", query: "" };

describe("buildStream", () => {
  it("merges requests in and callbacks out, newest first", () => {
    const s = buildStream([run({})], [delivery({})], catalog);
    expect(s.map((e) => e.direction)).toEqual(["out", "in"]);
  });

  it("takes the inbound path from the catalog, and falls back for an unknown agent", () => {
    const s = buildStream([run({}), run({ id: "j2", agentType: "gone" })], [], catalog);
    expect(s.find((e) => e.agentType === "quiz-generator")?.path).toBe("/agents/quiz-generator");
    expect(s.find((e) => e.agentType === "gone")?.path).toBe("/agents/gone");
  });

  it("doesn't call a workflow-spawned job an HTTP request", () => {
    const [e] = buildStream([run({ workflowId: "wf1" })], [], catalog);
    expect(e?.direction === "in" && e.http).toBe(false);
  });

  it("drops the query string from callback paths", () => {
    const [e] = buildStream([], [delivery({})], catalog);
    expect(e?.path).toBe("/api/v1/quiz");
  });

  it("survives an unparseable URL", () => {
    const [e] = buildStream([], [delivery({ url: "not a url" })], catalog);
    expect(e?.path).toBe("not a url");
  });
});

describe("filterStream", () => {
  const events = buildStream(
    [run({}), run({ id: "dead1", status: "dead", requestId: "needle" })],
    [delivery({}), delivery({ id: "cb2", ok: false, responseStatus: 503 })],
    catalog,
  );

  it("filters by direction", () => {
    expect(filterStream(events, { ...none, direction: "out" }).every((e) => e.direction === "out")).toBe(true);
  });

  it("treats dead runs and failed callbacks as failures", () => {
    const failed = filterStream(events, { ...none, result: "failed" });
    expect(failed).toHaveLength(2);
  });

  it("searches request ids and paths", () => {
    expect(filterStream(events, { ...none, query: "NEEDLE" })).toHaveLength(1);
    expect(filterStream(events, { ...none, query: "/api/v1/quiz" })).toHaveLength(2);
  });
});
