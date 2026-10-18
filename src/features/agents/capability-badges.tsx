import { LockKeyholeIcon, PlugZapIcon, StampIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { AGENT_TRAITS, TRAIT_META } from "@/data/agent-traits";
import type { CatalogEntry } from "@/types";

/** Platform guarantees the catalog API declares per agent, in plain words. */
export const POLICY_META = {
  approval: {
    label: "Human approval",
    hint: "Delivery is held until a project admin approves it.",
    icon: StampIcon,
    className: "bg-warning-bg text-warning",
  },
  protected: {
    label: "Encrypted at rest",
    hint: "Payloads, checkpoints and results are AES-256-GCM encrypted; nothing is exported to search or memory.",
    icon: LockKeyholeIcon,
    className: "bg-info-bg text-info",
  },
  tools: {
    label: "Tool-ready",
    hint: "Built for a bounded MCP tool round — grant it tools on the Tools page.",
    icon: PlugZapIcon,
    className: "bg-brand-muted text-brand",
  },
} as const;

/**
 * Policy badges (from the catalog contract) followed by behavioural traits
 * (from the agent's source). `compact` drops traits for dense cards.
 */
export function CapabilityBadges({
  entry,
  compact = false,
  className,
}: {
  entry: CatalogEntry;
  compact?: boolean;
  className?: string;
}) {
  const policies: Array<keyof typeof POLICY_META> = [];
  if (entry.riskTier === "high") policies.push("approval");
  if (entry.dataClass === "protected") policies.push("protected");
  if (entry.toolsEnabled) policies.push("tools");
  const traits = compact ? [] : AGENT_TRAITS[entry.agentType] ?? [];

  if (policies.length === 0 && traits.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {policies.map((p) => {
        const m = POLICY_META[p];
        return (
          <span
            key={p}
            title={m.hint}
            className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", m.className)}
          >
            <m.icon className="size-3" aria-hidden />
            {m.label}
          </span>
        );
      })}
      {traits.map((t) => (
        <span
          key={t}
          title={TRAIT_META[t].hint}
          className="rounded-md bg-raised px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          {TRAIT_META[t].label}
        </span>
      ))}
    </div>
  );
}
