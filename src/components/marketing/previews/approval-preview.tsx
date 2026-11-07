"use client";

import { CheckIcon } from "lucide-react";

import { JsonPanel } from "@/components/json-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnyStatusBadge } from "@/components/ui/status-badge";
import { IdChip } from "@/components/ops/primitives";
import { PreviewFrame } from "./preview-frame";
import { SAMPLE_APPROVAL } from "./fixtures";

/** The approval center: what the agent was asked, beside what it wants to deliver. */
export function ApprovalPreview({ className }: { className?: string }) {
  const a = SAMPLE_APPROVAL;
  return (
    <PreviewFrame
      className={className}
      path="northwind / approvals · 1 pending"
      caption="Approval center: a held SEO page delivery shown next to the input the agent received, with editable fields and approve or reject controls."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{a.agentName}</p>
            <IdChip id={a.jobId} label="Run" />
            <AnyStatusBadge value="pending_approval" />
          </div>
          <span className="rounded-md border border-border bg-raised px-2 py-1 font-mono text-[11px] text-muted-foreground">
            on approve → {a.target.method} {a.target.path}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-w-0">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">Input</p>
            <JsonPanel value={a.input} label="input" maxHeight="max-h-[260px]" />
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">Proposed delivery</p>
            <div className="space-y-1.5">
              <Label htmlFor="pv-h1">H1</Label>
              <Input id="pv-h1" readOnly value={a.proposed.h1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pv-mt">Meta title</Label>
              <Input id="pv-mt" readOnly value={a.proposed.meta_title} />
              <p className="text-[11px] tabular-nums text-faint">{a.proposed.meta_title.length} / 60</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pv-bc">Body (HTML source)</Label>
              <Textarea id="pv-bc" readOnly rows={4} className="font-mono text-xs" value={a.proposed.body_content} />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" tabIndex={-1}>
                <CheckIcon />
                Approve and deliver
              </Button>
              <Button size="sm" variant="outline" tabIndex={-1}>
                Reject…
              </Button>
              <span className="text-xs text-faint">A rejection note becomes a style rule.</span>
            </div>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
