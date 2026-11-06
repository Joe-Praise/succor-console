# Succor Console — Full UI Redesign

Branch: `feat/console-redesign` (cut from `feat/control-plane`, which holds every page this restyles).

## Why

The control-plane work made the console correct but not sharp. The brief: match the level of
railway.com — interactive, engaging, flows and illustrations, across the whole app — and replace the
docs, whose design and content are both weak.

## What Railway actually does (from screenshots and its CSS, 2026-11-06)

| Trait | How Railway does it | What we take |
|---|---|---|
| The product IS a picture | Project opens on a dotted canvas of service tiles joined by wires, with zoom controls left and Create right | Project home becomes a live **Canvas** of the real request path |
| No heavy sidebar | Breadcrumb (`project / env`) + right-aligned tabs (Architecture, Observability, Logs, Settings) | Top bar with breadcrumb + tabs; content gets the full width |
| Crisp density | 1px borders, ~8px radii, near-zero shadow, near-black surfaces, 13px UI | New shape and type scale |
| Serif over dense UI | IBM Plex Serif display, Inter UI | Newsreader display (already ours), Geist UI |
| Observability as widgets | Grid of titled widgets with thin stepped lines and an error-log table | **Observe** dashboard |
| A signature motif | A train travels a vertical rail through tinted section panels as you scroll | Our own: the **signal line** (below) |
| Painted illustration | Night sky hero behind a floating product window | Our own original night-ridge art |

## Identity: "the signal line" — ours, not a copy

Copying Railway's purple, train and painted clouds would make Succor look like a clone. We take the
quality bar and the structure; the identity stays ours.

- **Metaphor:** a request travels a line through stations: *accepted → working → held → delivered*.
  Railway has rails and a train; Succor has a relay line and a lit signal. The same motif draws the
  canvas wires, the run flow, the docs diagrams, the empty states and the marketing spine.
- **Palette:** plum-black ink (`#0f0d12`), warm white text, **ember** accent (`#f27d4f`, evolved from
  our clay). Filled ember primary buttons. Bright thin chart lines. Light theme kept and retuned.
- **Illustration:** original SVG: dusk ridgelines, relay towers with lit lanterns, a signal arc passing
  between them, stars and grain. No third-party art.

## Non-negotiables carried over

- Real contracts only. No fabricated numbers in the product; a metric we can't source says so.
- Job status, agent outcome and delivery stay three separate things.
- Row-navigation standard, URL state for filters, reduced-motion respected, GSAP for choreography.
- No URL breaks: routes stay, only the navigation over them changes (new routes are additive).

## Information architecture

Project tabs (sidebar removed):

| Tab | Holds |
|---|---|
| **Canvas** | `/p/:id` — the live graph (replaces the KPI overview) |
| **Runs** | `/runs`, `/runs/:id` |
| **Approvals** | `/approvals` (live count) |
| **Observe** | **Dashboard** `/observe` (new), **Requests** `/requests` (new), Logs, Callbacks, Usage |
| **Build** | Agents, Workflows, Playground, Tools, Profile |
| **Docs** | `/docs/*` |
| **Settings** | General, API keys, Audit, Invoices, Support |

Org scope: Projects, Team, Billing, Settings. Admin scope: its own tab row, reached from the user menu.

## Phases (one commit each)

1. **Foundation.** Tokens, shape and type scale, primitives (button, input, card, badge, tabs, table),
   marketing forced dark, illustration kit, line-motif empty states.
2. **Shell.** Top bar, breadcrumb, tabs and sub-tabs, ⌘K, auth screens over the illustration.
3. **Canvas.** Pure graph + layout builder (tested). Pan, zoom, fit, drag with saved positions. Tiles:
   your backend, Succor API, agents grouped by category, human review, callback endpoints, MCP servers,
   workflows. Animated wires when live. Inspector panel with `?node=` URL state. Activity dock, health
   strip, go-live checklist, mobile stack.
4. **Observe.** Widget dashboard with synced crosshair, **Requests** stream (accepted requests inbound,
   callback attempts outbound, live tail, expandable rows), Logs and Callbacks as streams.
5. **Execution.** Run flow (station line, tested), run detail restructure, workflow graph, approvals
   review view.
6. **Docs.** New docs system, public `/docs` and project-scoped docs (real values filled in). Shell with
   nav, search, scroll-spy TOC, prev/next. Interactive request builder, job state machine, guard chain,
   retry timeline. Content rewritten from source, not from the stale `INTEGRATION-GUIDE.md`.
7. **Rest of the app.** Org home with project tiles, agents, tools, playground, keys, settings, team,
   billing, invoices, support, admin.
8. **Marketing.** Illustrated hero with floating product window, scroll-driven signal spine through
   tinted section panels, floating section dock, real-component previews. Remaining marketing pages.
9. **Verification.** `tsc`, eslint, vitest, `next build`, screenshots of every route in dark, light and
   mobile against a local mock.

## Corrections the docs must carry (found in source)

- Guard order: key↔project → budget (402) → enablement (403) → idempotency → schema (400) → enqueue.
- **A 400 burns the `requestId`** (idempotency inserts before schema validation): retry with a new id.
  402 and 403 don't burn it, so the same id is safe later.
- A duplicate returns `200 { accepted: false, duplicate: true }`.
- The budget cap is **soft**: a burst can marginally overshoot, and a guard DB failure fails open.
- Callbacks: 3 attempts, backoff 5s then 10s, 30s timeout. 5xx, 429 and no-response retry; other 4xx are
  final. Delivery is at-least-once, so dedupe on `X-Delivery-Id`.
- `environment` resolves to label match → `production` → first entry.
- `INTEGRATION-GUIDE.md` still teaches `X-Service-Secret`; tenants use `Authorization: Bearer ask_live_…`.

## Verification without a backend

A throwaway mock of the agent-service API lives in the scratchpad (not in this repo) so every route can
be rendered and screenshotted with data. It's a visual harness only. A click-through against the real
backend is still required before merging.
