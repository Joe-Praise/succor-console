"use client";

import { useState } from "react";
import { ActivityIcon, ArrowLeftRightIcon, LineChartIcon, NetworkIcon, StampIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ApprovalPreview } from "@/components/marketing/previews/approval-preview";
import { CanvasPreview } from "@/components/marketing/previews/canvas-preview";
import { ExecutionPreview } from "@/components/marketing/previews/execution-preview";
import { RequestsPreview } from "@/components/marketing/previews/requests-preview";
import { UsagePreview } from "@/components/marketing/previews/usage-preview";

const VIEWS: Array<{ id: string; label: string; icon: LucideIcon; node: React.ReactNode }> = [
  { id: "canvas", label: "Canvas", icon: NetworkIcon, node: <CanvasPreview /> },
  { id: "requests", label: "Requests", icon: ArrowLeftRightIcon, node: <RequestsPreview /> },
  { id: "run", label: "A run", icon: ActivityIcon, node: <ExecutionPreview /> },
  { id: "review", label: "Review", icon: StampIcon, node: <ApprovalPreview /> },
  { id: "usage", label: "Usage", icon: LineChartIcon, node: <UsagePreview /> },
];

/** The floating product window, with a dock to look around the console. */
export function ProductDock() {
  const [active, setActive] = useState("canvas");
  const view = VIEWS.find((v) => v.id === active)!;
  return (
    <div>
      <div key={view.id} className="rise-in">
        {view.node}
      </div>
      <div role="tablist" aria-label="Product views" className="no-scrollbar mx-auto mt-4 flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface/90 p-1 backdrop-blur">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === active}
            onClick={() => setActive(v.id)}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
              v.id === active ? "bg-brand-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <v.icon className={cn("size-3.5", v.id === active ? "text-brand" : "text-faint")} strokeWidth={1.75} aria-hidden />
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
