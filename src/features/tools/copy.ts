import { ApiError } from "@/api/client";
import type { SideEffectClass } from "@/types";

/** Grant refusal reasons → plain language (agent-service lib/tool-grants.ts). */
export const REFUSAL_COPY: Record<string, string> = {
  "unknown-agent": "That agent isn't in the catalog.",
  "agent-not-enabled": "That agent isn't enabled on this project.",
  "server-not-found": "That server doesn't exist in this project.",
  "server-disabled": "That server is disabled — enable it first.",
  "tool-not-exposed": "The server's allowlist doesn't expose that tool.",
  "invalid-schema": "The parameters schema isn't a valid, object-shaped JSON Schema.",
  duplicate: "An active grant for this agent + server + tool already exists.",
};

export const CLASS_COPY: Record<SideEffectClass, { label: string; note: string; runnable: boolean }> = {
  READ_ONLY: { label: "Read-only", note: "Executable. The only class the runtime will call.", runnable: true },
  IDEMPOTENT_WRITE: { label: "Idempotent write", note: "Recorded, not yet runnable.", runnable: false },
  NON_IDEMPOTENT_WRITE: { label: "Non-idempotent write", note: "Recorded, not runnable.", runnable: false },
  UNKNOWN: { label: "Unknown", note: "Refused at execution.", runnable: false },
};


/** Map a grant/server API error to plain language (refusal reasons first). */
export function errMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    const reason = (err.data as { reason?: string } | undefined)?.reason;
    if (reason && REFUSAL_COPY[reason]) return REFUSAL_COPY[reason];
    return err.message;
  }
  return fallback;
}
