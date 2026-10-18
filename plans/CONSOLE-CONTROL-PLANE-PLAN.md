# Succor Console — Execution Control Plane Overhaul

## Context

The console now *lists* what the backend can do, but it doesn't let a developer **operate** it. They
can't find a run, see its lifecycle, separate job status from delivery status, trace a charge back to
its execution, or review approvals with context. The user's brief and references (Kestra dashboard,
Agent Execution Viewer, AI/ML API usage, Dynatrace trace) set the bar: five operational views —
**Operations overview, Execution explorer + detail, Usage & economics, Traces/diagnostics, Approval
center** — built on real contracts, never mock data.

Decisions already made by the user:
- **Theme — "warm dark control plane":** the **app** (console, auth, admin) is dark-default — the existing warm charcoal `#211f1c` + clay `#d97757`, made denser — with light available via the existing toggle. The **marketing site stays light** (its product previews render as dark "screenshots" inside it).
- **Backend:** add small, tested, **read-only** endpoints in agent-service.
- **Tests:** add vitest + Testing Library to the console.
- **Marketing:** illustrative product-preview panels built from real app components, clearly labelled.

### What the audit established (drives everything below)

| Need | State today |
|---|---|
| Run list | **No list endpoint** (index `{projectId, createdAt:-1}` exists, unused) |
| Job detail | `GET /agents/jobs/:id` omits checkpoints, requestId, workflowId, reviewed*, payload |
| Timeline | Recorded timestamps exist: job `createdAt/updatedAt/reviewedAt`, `checkpoints[name].completedAt`, Effect `createdAt/readyAt/claimedAt/succeededAt/failedAt/cancelledAt/deadAt`, AgentLog `ts`, audit `ts` — **none exposed** |
| Per-attempt history, step start times | **Not stored** (`lastError`/`nextRunAt`/`attempt` overwritten; approve resets attempt) |
| Delivery per job | `Effect` (kind `http.callback`, status, attempt≤3, error, outcomeUnknown, deliveryId) — **no route**. `CallbackDelivery` (HTTP status) has **no jobId** |
| Cost per job | `AgentLog.jobId` (partial index) → tokens, `estimatedCostUsd`, `billedUsd`, markup, pricingVersion — no route; can be 2 rows (gated re-embed); chat/embedding split **not stored** |
| Usage aggregates | `GET /projects/:id/usage` (day/month/year × agent/model) + `/usage/current` — already enough for stacked charts, deltas (second range query), budget % |
| Approval history | Only via audit ledger (`approval.*`, targetId=jobId); rejected jobs not listable |
| Traces | No trace/span/correlation ids. Tool calls = `Effect kind:"mcp.tool"` (result text not stored) |
| Cancel/retry/replay | **None.** `requeueEffect` exists in lib only |
| Console | Global next-themes (`defaultTheme="light"`), `--color-info` aliases clay brand (running ≈ warning in dark), no `color-scheme`, tooltip token bug (`--surface-overlay`), `max-w-6xl` caps, no density, `LogRow`×4 / `usd()`×4 / `ERROR_STATUSES`×3 duplicates, `JobChip` polls per chip, **no test setup** |

Category A (existing contracts): usage charts/deltas/budget, approvals pending + decide, audit history, workflows.
Category B (this plan adds read-only endpoints): run list, execution record, checkpoint output, usage records, ops summary.
Category C (documented, not built): per-attempt history, step start times/true spans, delivery↔HTTP-attempt link, cancel/retry/redeliver, trace ids, tool-result capture.

---

## Phase 0 — Commit the previous alignment pass (portal)
The last session's console work is uncommitted. Commit it as-is first (`feat(console): align console with backend capabilities`) so this overhaul diffs cleanly. Copy this plan to `agent-service-portal/plans/CONSOLE-CONTROL-PLANE-PLAN.md` (project convention: ALL-CAPS plans in repo).

## Phase 1 — Backend read-only endpoints (agent-service, its own commit)

**Constraint:** agent-service has uncommitted 4I.37–4I.41 WIP in `callbacks.ts`, `job-worker.ts`, `mongodb.ts`, `agent-context.ts`, `agent-catalog.ts`, quiz-generator and tests. **Touch none of them.** Stage only new files + `src/server.ts` (not in WIP).

New `src/routes/executions.ts`, mounted `app.use("/portal", executionsRouter)` in `src/server.ts`. Guards **per route** (`requireProjectRole("developer")` from `lib/org-guards.ts`) — never `router.use`, because `/portal` is a shared mount. Tenant boundary = `:projectId` path param only. New `src/lib/cursor.ts` with keyset encode/decode mirroring `routes/audit.ts` (base64url `{t,i,p}`, project-bound, 400 on foreign/malformed); audit.ts left untouched.

1. `GET /portal/projects/:projectId/jobs` — filters `status` (csv, validated against the enum), `agentType`, `workflowId`, `requestId`, `from`, `to`; `limit` clamp [1,100]; cursor on `(createdAt, _id)` desc. Row: `id, agentType, status, runStatus, attempt, maxAttempts, requestId, workflowId, initiatedBy, createdAt, updatedAt, lastError` (+ batched joins for the page's ids: `cost {costUsd, billedUsd}` summed from AgentLog by `jobId`; `delivery {status, attempt, outcomeUnknown}` from Effect `kind:"http.callback"`). Returns `{ jobs, nextCursor }`.
2. `GET /portal/projects/:projectId/jobs/:jobId` — the **execution record** (404 if not in project): `job` (above + `nextRunAt`, `reviewedAt`, `reviewedBy`, `reviewNote`, decoded `result`, decoded `input` from payload via `decodeForDisplay`, per-field undecodable markers); `checkpoints: [{name, completedAt, usage?{inputTokens,outputTokens}}]` (no outputs); `effects: [{effectKey, kind, status, attempt, outcomeUnknown, error(sanitized), deliveryId, nextAttemptAt, createdAt, readyAt, claimedAt, succeededAt, failedAt, cancelledAt, deadAt, target}]` where `target` = `{method, path}` for `http.callback`, `{serverId, toolName, sideEffectClass}` for `mcp.tool` (never args/headers/secrets); `usage: AgentLog rows for jobId`; `audit: AuditEvent where targetType=agentJob,targetId=jobId` (same projection as audit.ts `view`).
3. `GET /portal/projects/:projectId/jobs/:jobId/checkpoints/:name` — one decoded checkpoint output (bounded; 404 unknown name; degrades on undecodable).
4. `GET /portal/projects/:projectId/usage-records` — AgentLog projection `id, ts, jobId, agentType, model, status, inputTokens, outputTokens, embeddingTokens, toolCalls, estimatedCostUsd, billedUsd, markupMultiplier, pricingVersion, durationMs`; filters `agentType, model, status, jobId, from, to`; cursor on `(ts, _id)`; `{ records, nextCursor }`. Leaves `GET /projects/:id/logs` unchanged.
5. Single-record reads so every list row can open a shareable page (Phase 3b):
   - `GET /portal/projects/:projectId/usage-records/:recordId` — one AgentLog row (same projection as 4).
   - `GET /portal/projects/:projectId/callbacks/:deliveryId` — one CallbackDelivery by `_id`, project-scoped (no route clash: portal.ts only has the exact `/callbacks` list).
   - `GET /portal/projects/:projectId/audit/:eventId` — one AuditEvent; reuse the projection by exporting `view` from `routes/audit.ts` (one-line export; audit.ts is not WIP).
   - Jobs list (1) also accepts `initiatedBy` (exact match) so an API key's page can list the runs it started.
6. `GET /portal/projects/:projectId/ops-summary?from&to` (window default 7d, max 90d) — job counts by status (createdAt in window), live counts (queued/running/pending_approval, unbounded by window), callback-effect counts by status in window, AgentLog duration avg/p50/p95 (JS over ≤10k rows), `daily: [{date, succeeded, failed, avgDurationMs}]`.

(Endpoints 1–6 all live in `executions.ts`.) Tests `test/routes/executions.test.ts` (vitest + `test/helpers/http.ts` `startTestServer/json`, `mongo.ts`, `seed.ts`, RBAC seeding like `test/security/audit-read.test.ts`): tenant isolation (foreign project/job → 404), role guard, filters, cursor stability + foreign-cursor 400, batched cost/delivery joins, gated job with 2 usage rows, protected-agent decode, effect target never leaks payload args. `npm run typecheck && npm test`.

Contract doc `agent-service/plans/CONSOLE-EXECUTION-API-CONTRACT.md`: the 5 endpoints + **Category C** contracts (JobEvent/attempt history, `ctx.step` startedAt, `CallbackDelivery.{jobId,deliveryId}` — touches WIP `callbacks.ts`, do after 4I.41 commits — operator redeliver via `requeueEffect`, cancel, trace ids, tool-result capture).

## Phase 2 — Console foundation

- **Theme (app dark-default, marketing light):** `providers/theme-provider.tsx` becomes a client wrapper: `defaultTheme="dark"`, `enableSystem={false}`, and `forcedTheme="light"` when `usePathname()` is a marketing route (`/`, `/pricing`, `/agents[/*]`, `/contact`, `/platform`). Nested providers are a no-op in next-themes 0.4.6 and `resolvedTheme` ignores `forcedTheme`, so: remove `ThemeToggle` from `marketing-nav.tsx`; `sonner.tsx`, `theme-toggle.tsx` and the ⌘K toggle read `forcedTheme ?? resolvedTheme`; fix the palette's bogus `⌘K` shortcut label on the toggle item. Marketing previews wrap in a scoped `.dark` div (static, no portals, so tokens apply cleanly). `globals.css`: add `color-scheme` per theme; new `--info` (warm steel blue, both themes) and `--color-info: var(--info)` so *running* ≠ *warning*; dark shadows + stronger dialog/sheet overlays; separate `--chart-2` from `--success`; fix `--surface-overlay` tooltip bug (usage page) → shared chart tooltip style.
- **Density + layout:** `PageHeader` gains `size="compact"` (sans, 22px) for ops pages; table rows tightened; org layout `max-w-6xl` → `max-w-7xl` with a `wide` opt-out for explorer/detail pages; breadcrumbs component for detail pages.
- **Domain libs (dedupe):** `src/lib/format.ts` (usd/usdPrecise, duration, tokens, shortId, relative time) replacing 4× `usd()`, duration and id-slice variants; `src/lib/status.ts` (job/run/effect/workflow status sets + tone) used by `StatusBadge`, step-graph `DOT`, workflows `STEP_TONE`, usage `STATUS_TONE`.
- **Typed contracts:** replace loose `z.record` in `api/projects.ts` (logs/callbacks/playground) with schemas in `types/index.ts`; delete per-page `LogRow`/`DeliveryRow`. New `api/executions.ts` + `features/executions/hooks.ts` for Phase-1 endpoints (stable keys `["projects",id,"executions",…]`, `useInfiniteQuery` cursor pattern from `features/governance/hooks.ts`, polling only while live, paused when tab hidden).
- **Row-navigation standard (applies to every table and list):** `DataTable` takes `getRowHref(row)`. The row becomes one navigable unit via the stretched-link pattern: a real `<Link>` in the first cell, with `after:absolute after:inset-0` over a `relative` `<tr>`. This keeps cmd/middle-click, prefetch and screen-reader semantics. Rows also get `cursor-pointer`, a hover/focus tint, and Enter-to-open. In-row controls (revoke, approve, role menu, switches, copy) sit at `relative z-10` and stop propagation, so they never trigger navigation. Card-style lists (approvals, tickets, requests, workflow runs) use the same pattern on the card.
- **`DetailPage` shell** (`components/ops/detail-page.tsx`): breadcrumbs, compact header with `IdChip` and status, a facts grid, sectioned body, and a "related records" rail. Every new single-record page uses it, so detail pages look and behave the same.
- **Shared components** (`src/components/ops/`): `KpiCard` (definition tooltip, period, optional delta, explicit *unavailable* state), `DataTable` (border/sticky header/dense rows/loading-empty-error slots; fixes double scroll wrapper), `FilterBar` + `useUrlFilters` (URL state via `useSearchParams` in Suspense, `router.replace`), `TimeRangePicker`, `CursorPager`, `IdChip` (mono + copy), `Callout` (replaces 8 banner copies), `ChartFrame` + `StackedBars` + `Donut` (recharts, token colors), `StatusTriplet` (Job · Run outcome · Delivery as three labelled badges).
- **Tests:** add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`; `vitest.config.mts` with `@/` alias; `npm test` script.

## Phase 3 — Execution explorer + detail (centerpiece)

- Routes: `p/[projectId]/runs/page.tsx` and `runs/[jobId]/page.tsx`; existing `jobs/*` become thin redirects. Nav label "Runs" (lib/nav Operate group), ⌘K "Open run by ID".
- **Runs list:** URL filters (status multi, agent, workflow, time range, job/request id), dense `DataTable` (status, id chip, agent, created, elapsed, attempts, billed, delivery badge), cursor "Load more", live polling while page 1 has live rows.
- **Run detail** (Agent Execution Viewer layout): breadcrumb + header (agent, `IdChip`, `StatusTriplet`, requestId/workflowId chips); KPI strip (elapsed, attempts n/max, provider cost → billed, tokens, delivery); left **event list** (search + All/Steps/Delivery/Approval/Errors) ; right tabs **Timeline · Output · Input · Cost · Delivery · Diagnostics · Audit**.
  - `features/executions/timeline.ts` (pure, unit-tested): builds ordered events **only from recorded timestamps** (accepted=createdAt, checkpoint committed=completedAt, effect ready/claimed/succeeded/failed/dead, approval reviewedAt, billed=AgentLog ts). Gaps labelled "time since previous recorded event" — never "step duration". Shows an explicit note that per-attempt history isn't recorded.
  - Step inspector: checkpoint name, committed time, token usage, lazy output via endpoint 3 in `JsonPanel`.
  - Output: decoded result, runStatus as validation outcome, copy/download; HTML never rendered.
  - Cost: AgentLog rows (model, tokens, provider cost, markup, billed, pricingVersion); states plainly that embedding cost isn't split and tool/infra/delivery aren't metered; explains 2-row gated case.
  - Delivery: per callback effect — status, attempt/3, timestamps, next attempt, outcome-unknown, sanitized error, `X-Delivery-Id`; "execution succeeded ≠ delivered" callout; link to Callbacks page (HTTP attempt log not linkable yet — Category C note).
  - Diagnostics: `classifyFailure(job)` maps dead / validation_failed / rate_limited / error / delivery dead to plain explanation + conservative next step; all identifiers copyable.
  - Actions: only real ones — Approve/Reject (when `pending_approval`, admin). No retry/cancel buttons.
- Workflow detail: replace per-chip `useJob` polling with one runs-list query filtered by `workflowId`; add a job-span chart (job createdAt → updatedAt, labelled as recorded bounds).

## Phase 3b — Every record gets a page; every row is clickable

Audit result: of ~25 tables and lists, only org-overview project cards, the workflow-run list and admin org names navigate. Logs, callbacks, audit, invoices (dialog only), keys, tool grants/servers, support tickets, agent requests and all admin tables have **no single-record view**, and projects uses a separate "Open" button. Each list row should open that record's own shareable page.

| List (where) | Row opens | Data source |
|---|---|---|
| Runs (`runs`) + overview "Running now"/"Recent runs" | `runs/[jobId]` | execution record (Phase 1-2) |
| Logs (`logs`, rebuilt on usage-records: cursor, URL filters agent/model/status/date) | `logs/[recordId]`: full priced record (tokens, provider cost → markup → billed, pricingVersion, duration, error, actor) + linked run summary, or a "no linked run" note for legacy/`reindex-content` rows | new 5a + execution record |
| Callbacks (`callbacks`) | `callbacks/[deliveryId]`: method + full URL, env label, HTTP status, duration, sanitized error, agent, time; verification-header guidance; "link to run not recorded yet" (Category C) | new 5b |
| Audit (`audit`) | `audit/[eventId]`: actor, action, outcome, target (→ run/workflow), category, counts, note length, "signed at write" explainer | new 5c |
| Invoices (project `invoices` + org `billing` invoice list) | `invoices/[invoiceNumber]` page replaces `InvoiceDetailDialog`: line items by agent (each → runs filtered by agent + period), status history, submit-payment action (owner) | existing `GET /projects/:id/invoices/:n` |
| Org projects table (`o/[orgId]/projects`) | project overview (drop the "Open" button) | existing |
| Org billing by-project rows | that project's `usage` page | existing |
| Usage breakdown rows (by agent / by model) | runs filtered by agent / usage records filtered by model | existing + Phase 1 |
| API keys (`keys`) | `keys/[keyId]`: prefix/last4, created by, last used, revoked, **runs started by this key** (jobs list `initiatedBy=apikey:<id>`); revoke stays an in-row control | existing list + Phase 1 filter |
| MCP servers / tool grants (`tools`) | `tools/servers/[serverId]` (config, allowlist, its grants) and `tools/grants/[grantId]` (attested schema, side-effect class, granted/revoked lifecycle) | existing lists |
| Support tickets (`support`) | `support/[ticketId]` (message, status, support reply) | existing list |
| Agent catalog cards (`agents`) | `agents/[agentType]` page replaces the sheet: contract, capability badges, enablement, **recent runs + spend for this agent** | catalog + Phase 1 + usage `groupBy=agent` |
| Agent requests (`agents`) | `agents/requests/[requestId]` (description, inputs, callback, status timeline, admin notes) | existing list |
| Playground recent runs | URL state `?run=<id>`, so a run is linkable | existing `GET …/playground/runs/:id` |
| Workflow runs, org project cards, approvals | already navigate; convert to the stretched-row standard; each approval card → its run | existing |
| **Admin:** logs, projects, users, orgs, support, billing invoices, requests | `admin/logs/[logId]` (via the admin logs list + run link), `admin/projects/[projectId]` (config dialog becomes the page's edit panel), `admin/users/[userId]`, whole-row link to the existing `admin/orgs/[orgId]`, `admin/support/[ticketId]`, admin invoice page | existing admin lists |
| Team members / invites | **stay inline** — role menu and remove/revoke are the row's purpose and there's no per-member data to show | — |

Pages derived from small existing lists (keys, servers, grants, tickets, requests, admin users/projects) fetch the list through the cached query and select by id. They show a proper not-found state if the id is missing, so no new endpoint is needed.

## Phase 4 — Usage & economics

Rework `p/[projectId]/usage/page.tsx`: time range in URL; KPI row (provider cost, billed, runs, tokens, cost/run, error rate, budget %) with deltas from a second `useUsage` query for the previous equal-length range; three `StackedBars` (Spend / Runs / Tokens by agent or model, legend with value + share) from existing `groupBy`; budget panel (`BudgetMeter` + scope: project, UTC month, 402 before enqueue, 80% platform alert); **usage-records table** (endpoint 4, filters, cursor, every row → run detail, CSV of loaded rows); "What's metered" panel stating inclusions/exclusions and retry/failure billing semantics.

## Phase 5 — Approvals, overview, marketing

- **Approval center:** Pending tab = existing `ApprovalCard` upgraded with side-by-side **Input** (execution record `input`) vs **Proposed delivery**, run outcome, link to run; History tab = audit `approval.*` events (cursor) + run links. Same `useDecideApproval` mutation, 409 conflict feedback.
- **Operations overview** (project `page.tsx`, Kestra layout): time range; KPIs (success/failure ratio, runs, live now, pending approvals, delivery failures, p95 duration, spend vs budget) from ops-summary + usage; executions/day success-vs-failed stacked bars + avg-duration line; outcome donut; "Running now" (runs list `status=queued,running`) and "Needs attention" (failed runs, dead deliveries, approvals); setup checklist collapses once complete. Org overview gets a per-project health roll-up from existing billing summary.
- **Marketing (stays light):** `src/components/marketing/previews/{execution-preview,usage-preview,approval-preview}.tsx` composed from the real ops components with static fixtures and a visible "Illustrative" label, each rendered inside a scoped `.dark` frame so they read as product shots of the dark console against the light page; hero uses the execution preview, `/platform` embeds all three. GSAP only for reveal (existing `Reveal`), reduced-motion respected.

## Critical files

- Backend: `agent-service/src/routes/executions.ts` (new), `src/lib/cursor.ts` (new), `src/server.ts` (mount), `src/routes/audit.ts` (export `view` only), `test/routes/executions.test.ts` (new), `plans/CONSOLE-EXECUTION-API-CONTRACT.md` (new).
- Console: `src/providers/theme-provider.tsx`, `src/app/globals.css`, `src/lib/{format,status,nav}.ts`, `src/types/index.ts`, `src/api/{executions,projects}.ts`, `src/features/executions/{hooks,timeline,diagnostics}.ts`, `src/components/ops/*`, `src/components/page-header.tsx`, `src/components/ops/{data-table,detail-page}.tsx`, `p/[projectId]/{page,runs/*,logs/*,callbacks/*,audit/*,invoices/*,keys/*,tools/*,support/*,agents/*,usage,approvals,workflows/[workflowId]}`, `admin/{logs,projects,users,support}/[id]`, `features/invoices/invoice-ui.tsx` (dialog → page), `src/components/marketing/previews/*`, `vitest.config.mts`, `package.json`.
- Reuse: `JsonPanel`, `CodeBlock`, `AnyStatusBadge`, `LifecycleRail`, `BudgetMeter`, `useUsage`/`useCurrentUsage`, `useApprovals`/`useDecideApproval`, `useAuditEvents` cursor pattern, `lib/csv.ts`, `RoleGate`/`ORG_ROLE_RANK`, `useProjectScope`.

## Verification

1. agent-service: `npm run typecheck`, `npm test` (new route tests + full suite green); `git diff --cached` shows only new files + server.ts.
2. Console: `npx tsc --noEmit`, `npx eslint src` (no new findings; 3 pre-existing), `npm test` (timeline ordering, no inferred checkpoints, status separation, classifyFailure, format/usd, useUrlFilters round-trip, KpiCard unavailable state, StatusTriplet), `npx next build`.
3. Row navigation: in every listed table, clicking anywhere on a row opens its page; cmd/middle-click opens a new tab; Tab + Enter works; in-row buttons (revoke, approve, switches, copy) act without navigating; each detail page has a not-found state for a bad id and a breadcrumb back to its list with filters intact.
4. Theme: fresh browser (cleared storage) → `/` renders light, `/login` and `/o/...` render dark; toggle to light inside the app persists across reloads and does not affect `/` (always light); dialogs/menus/⌘K/toasts match the app theme; native date inputs and scrollbars follow `color-scheme`.
5. Runtime (needs live Mongo + backend): `npm run dev` both; seed via playground/`scripts/dev-tenant-receiver.ts` (:4100 `/fail`); walk: run → runs list → detail (timeline, delivery failing then retrying, cost rows) → usage record → back to run; approve/reject a gated seo-page-factory job (OpenAI quota permitting — previously exhausted); confirm developer role sees no admin actions and a foreign project id 404s.

Report after each phase: files changed, contracts reused, gaps found, test results, limitations. Each phase = one commit.
