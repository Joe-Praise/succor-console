# CONSOLE ALIGNMENT PLAN — bring Succor Console up to the agent-service backend

**Date:** 2026-10-17 · **Backend reference:** `agent-service` @ `a069e18` (branch `agentic-ai`, plus uncommitted 4I.38R–4I.41 WIP — read-only for this work)
**Scope:** portal only (`agent-service-portal`). No backend code changes. The capability inventory lives in `agent-service/docs/CAPABILITIES.md`.

---

## 1. Why

The console was built against the Section A–D backend (billing, keys, orgs, playground, callbacks).
Since then the backend shipped the production harness and governance layers. The console now
undersells the platform and, in places, documents the wrong contract.

### Hard misalignments (wrong today)

| # | Where | Console says / does | Backend actually does |
|---|---|---|---|
| M1 | Docs quickstart | `const { runId } = await res.json()` | `202 { accepted, jobId, projectId, agentType, initiatedBy, …idField }` |
| M2 | Docs + marketing | "Your app never polls" / callback is the only result channel | `GET /agents/jobs/:jobId` returns status, attempts, lastError, result |
| M3 | Callbacks page | reads `statusCode` | `CallbackDelivery.responseStatus` (+ `method`, `envLabel`) |
| M4 | Catalog types | strips `riskTier`, `dataClass`, `toolsEnabled`, `model`, `maxTokens` | all returned by `GET /portal/catalog` |
| M5 | Permissions mirror | missing `project.audit.read`, `project.toolGrants.write` | present in `src/lib/permissions.ts` |
| M6 | Settings | always blank base URLs (never loads current) | `GET /orgs/:orgId/projects` returns `apiBaseUrls` |
| M7 | Logs | no error state, no job link | `AgentLog.jobId`, `toolCalls` available |

### Backend surfaces with no console UI at all

| Surface | Endpoints | Role |
|---|---|---|
| Durable jobs | `GET /agents/jobs/:jobId` | developer (project member) |
| Human approvals | `GET/POST /portal/projects/:id/approvals[/:jobId]` | read developer · decide admin |
| Workflows | `POST /portal/projects/:id/workflows/:type`, `GET …/workflows[/:id]` | start admin · read developer |
| MCP servers | `POST/GET/PATCH/DELETE /portal/projects/:id/mcp-servers[/:id]` | write admin · read developer |
| Tool grants | `POST/GET/DELETE /portal/projects/:id/tool-grants[/:id]` | write admin · read developer |
| Audit ledger | `GET /portal/projects/:id/audit` (filters + keyset cursor) | developer |
| Business profile | `GET/PATCH /portal/projects/:id/profile` | read developer · write admin |
| Support tickets | `POST/GET /portal/projects/:id/support-tickets`, `GET/PATCH /admin-api/support-tickets[/:id]` | developer · platform admin |

---

## 2. Repositioned information architecture

Project nav moves from a flat list of 10 to four intent groups:

```
Overview
BUILD     Agents · Profile · Workflows · Playground · Docs
OPERATE   Jobs · Approvals · Logs · Callbacks
GOVERN    Tools (MCP) · Audit · API keys
ACCOUNT   Usage · Invoices* · Support · Settings          (* admin+)
```

One nav definition (`src/lib/nav.ts`) feeds the sidebar and ⌘K, so the two can't drift again.
Admin nav gains **Support**.

## 3. Build list

1. **Contract layer** — `types` (jobs, approvals, workflows, MCP, grants, audit, profile, tickets),
   `api/runtime.ts`, `api/tools.ts`, `api/governance.ts`, matching `features/*/hooks.ts`.
2. **Shared UI** — StatusBadge vocabulary extended to job/workflow/ticket states; `JsonPanel`;
   `LifecycleRail` (job state machine); `StepGraph` (workflow DAG).
3. **New pages** — Jobs (+ detail), Approvals, Workflows (+ detail), Tools, Audit, Profile, Support,
   Admin › Support.
4. **Reworked pages** — Overview (attention strip + setup checklist), Agents (risk/data/tool
   capability badges), Docs (async contract, polling, status-code table, approvals, tools,
   workflows), Logs, Callbacks, Settings, Playground result view.
5. **Marketing** — home copy aligned to real capabilities; new public `/platform` page; nav + sitemap.
6. **Docs** — `agent-service/docs/CAPABILITIES.md`: capability inventory + possibilities.

## 4. Explicitly out of scope

- Backend changes (agent-service has uncommitted staging WIP; it stays untouched).
- A tenant "list jobs" endpoint (doesn't exist — Jobs page derives recent job IDs from the run log
  and offers lookup by ID; approvals cover `pending_approval`).
- Effects/outbox, retention sweeps, audit verification/repair, evals — operator-only, no HTTP surface.
  Documented as platform capabilities, not console features.

## 5. Verification

`npx tsc --noEmit` and `npx eslint` green on the portal. Runtime click-through needs the live
backend + Mongo (not run in this pass).
