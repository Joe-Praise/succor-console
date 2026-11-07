"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";

import { AnyStatusBadge } from "@/components/ui/status-badge";
import { HttpStatus, MethodMark } from "@/components/ops/primitives";
import { PreviewFrame } from "./preview-frame";

type Row =
  | { dir: "in"; t: string; method: string; path: string; status: string }
  | { dir: "out"; t: string; method: string; path: string; host: string; code: number | null; ok: boolean; ms: number };

const ROWS: Row[] = [
  { dir: "in", t: "14:14:01", method: "POST", path: "/agents/campaign-writer", status: "running" },
  { dir: "out", t: "14:13:48", method: "PUT", path: "/api/v1/courses/41/quiz", host: "api.northwind.example", code: 200, ok: true, ms: 214 },
  { dir: "in", t: "14:13:32", method: "POST", path: "/agents/quiz-generator", status: "succeeded" },
  { dir: "in", t: "14:12:09", method: "POST", path: "/agents/seo-page-factory", status: "pending_approval" },
  { dir: "out", t: "14:11:51", method: "PATCH", path: "/api/campaigns/88/images", host: "api.northwind.example", code: 503, ok: false, ms: 96 },
  { dir: "out", t: "14:11:56", method: "PATCH", path: "/api/campaigns/88/images", host: "api.northwind.example", code: 200, ok: true, ms: 188 },
  { dir: "in", t: "14:10:40", method: "POST", path: "/agents/alt-text-optimizer", status: "succeeded" },
  { dir: "out", t: "14:09:12", method: "PUT", path: "/api/admin/seo/42", host: "api.northwind.example", code: 200, ok: true, ms: 342 },
];

/** Requests in and callbacks out, on one timeline, as the console shows them. */
export function RequestsPreview({ className }: { className?: string }) {
  return (
    <PreviewFrame path="northwind / production-api" activeTab="Observe" className={className} caption="The requests stream: requests accepted from your backend and callbacks sent to it, on one live timeline.">
      <div className="tile overflow-hidden">
        {ROWS.map((r, i) => (
          <div key={i} className="grid grid-cols-[16px_60px_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-hairline px-3 py-2 last:border-0">
            {r.dir === "in" ? <ArrowDownLeftIcon className="size-3.5 text-chart-2" aria-hidden /> : <ArrowUpRightIcon className="size-3.5 text-brand" aria-hidden />}
            <span className="font-mono text-[11px] text-faint tabular-nums">{r.t}</span>
            <span className="flex min-w-0 items-center font-mono text-xs text-foreground">
              <MethodMark method={r.method} />
              <span className="truncate">{r.path}</span>
            </span>
            {r.dir === "in" ? <AnyStatusBadge value={r.status} /> : (
              <span className="flex items-center gap-2">
                <span className="hidden font-mono text-[11px] text-faint tabular-nums sm:inline">{r.ms} ms</span>
                <HttpStatus status={r.code} ok={r.ok} />
              </span>
            )}
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}
