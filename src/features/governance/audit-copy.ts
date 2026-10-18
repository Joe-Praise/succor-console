/** Plain-language labels for audit ledger actions (agent-service AuditAction). */
export const AUDIT_ACTION_COPY: Record<string, string> = {
  "approval.approve": "Approved a held delivery",
  "approval.reject": "Rejected a held delivery",
  "retention.erase": "Erased protected payloads (retention)",
  "effect.requeue": "Re-queued a failed side effect",
  "audit.repair": "Repaired a malformed audit row",
};
