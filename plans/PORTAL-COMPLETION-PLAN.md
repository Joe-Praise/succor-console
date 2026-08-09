# PORTAL COMPLETION + REBRAND — "Succor Console" (as built, 2026-08)

Rebrand of `agent-service-portal` → **`succor-console`** plus completion of the frontend feature
gaps the audit found, under a strict security bar. Backend org migration was **documented only**
(not run). Full context + decisions are in the approved plan (`~/.claude/plans/elegant-knitting-fairy.md`).

## Security invariants (held for all new code)

- No secrets/service keys to the client; `/docs` renders the **placeholder** env block only
  (`agent-service/src/routes/portal.ts:79-83`); real `ask_live_`/`cbk_` only via the one-time
  reveal modal (`src/components/secret-reveal.tsx`).
- No client DB writes — all mutations go through `/api/bff/*` → agent-service (`requireProjectRole`/
  `requireOwner`). Auth boundaries respected (`can()` / `minRole`).
- Every new query renders loading **and** error states (`src/components/query-error.tsx` + retry).

## Done

- **/docs integration guide** — `src/app/(app)/o/[orgId]/p/[projectId]/docs/page.tsx`: placeholder
  `.env`, quickstart `fetch`, callback-handler boilerplate, per-enabled-agent request/callback tabs.
  Nav + ⌘K entries added. Shared **`src/components/code-block.tsx`** (also used by Overview + drawer).
- **Usage** — date-range presets + custom inputs, groupBy agent/model, status breakdown, CSV export
  (`src/lib/csv.ts`).
- **Overview** — month-to-date spend sparkline, recent-runs panel, slim env + "Full integration guide" link.
- **Agents** — catalog detail drawer (`ui/sheet`) + request status timeline
  (`src/features/agents/request-timeline.tsx`).
- **Rebrand** — `src/lib/brand.ts`: `BRAND_NAME="Succor"`, `PRODUCT_NAME="Succor Console"`,
  category-agnostic tagline, `hello@succor.com`. Layout `<title>` uses PRODUCT_NAME. Light marketing
  copy de-AI-boxed (hero eyebrow/H1/sub, footer). `package.json` + folder → `succor-console`.
- **Docs reconciled** — `agent-service/docs/FRONTEND-PLAN.md` (org-layer as-built) +
  `PRODUCT-OVERVIEW.md §4/§5.4` (warm-minimal, Succor Console).
- Typecheck green (`tsc --noEmit`, `next typegen`).

## Deferred / not done (by decision)

- **Org migration NOT run** (prod DB untouched). Command to run from `agent-service` when ready:
  `npx tsx src/scripts/migrate-orgs.ts --map "mr-mufasir:mufasir,edu-course:educourse" --owner-email praisejosephalimi@gmail.com --owner-name "Joe Praise" --dry-run` (then without `--dry-run`).
- **B-6 legacy-fallback cleanup** — gated on a confirmed live migration; remove the `orgId==null`
  fallback in `org-guards.ts` + `project-registry.ts`, stop reading `User.projectIds`.
- Confirm `hello@succor.com` domain. Full marketing reposition + SDK/webhooks subsystem (roadmap).
- Orphans left as-is: `src/app/design/page.tsx`, legacy `(app)/dashboard/page.tsx` (auth fallback).

## Verify

Run agent-service (:4000) + console (:3000). Log in → project: Docs (copy blocks), Usage (range /
groupBy / CSV), Overview (sparkline + recent runs), Agents (drawer + timeline). Brand reads "Succor
Console". OpenAI quota may 429 live agent runs — verify against already-logged data.
