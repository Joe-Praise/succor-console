"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/code-block";
import { SignalWire } from "@/components/ops/signal-wire";

// ---------------------------------------------------------------------------
// The journey: every request, station by station. It plays until you touch it.
// ---------------------------------------------------------------------------

const JOURNEY = [
  { key: "request", label: "Request", who: "Your server", text: "You POST to an agent with your API key and a requestId. The body says what to do; the key says which project it's for." },
  { key: "guards", label: "Guards", who: "Succor", text: "In order: is the key valid, does it match the project, is there budget, is the agent enabled, have we seen this requestId, does the body match the schema. Any failure answers immediately and nothing runs." },
  { key: "job", label: "Job", who: "Succor", text: "The request is saved as a durable job before any work starts, and you get 202 with a job id in milliseconds. From here a crash can't lose it." },
  { key: "work", label: "Work", who: "Succor", text: "A worker leases the job and runs the agent, saving each model step as a checkpoint. If the process dies, another worker picks it up and replays finished steps without paying for them twice." },
  { key: "review", label: "Review", who: "Your team", text: "Only for high-risk agents. The delivery is held until an admin approves, edits or rejects it. Everything else skips this station." },
  { key: "deliver", label: "Deliver", who: "Succor", text: "The validated result goes to your API, authenticated with your callback key. Failures retry with backoff, and every attempt is recorded." },
  { key: "you", label: "Your API", who: "Your server", text: "You verify the key, save the result, answer 2xx. Done. If a callback ever goes missing, the job is still there to poll." },
];

export function RequestJourney() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % JOURNEY.length), 3200);
    return () => clearInterval(t);
  }, [playing]);

  const step = JOURNEY[active]!;
  return (
    <div className="tile my-5 overflow-hidden">
      <ol className="no-scrollbar flex overflow-x-auto px-3 pt-4 pb-2">
        {JOURNEY.map((s, i) => {
          const passed = i < active;
          const here = i === active;
          return (
            <li key={s.key} className={cn("min-w-20", i < JOURNEY.length - 1 ? "flex-1" : "shrink-0")}>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setActive(i);
                }}
                aria-current={here ? "step" : undefined}
                className="group block w-full text-left"
              >
                <span className="flex h-4 items-center">
                  <span
                    className={cn(
                      "size-3 shrink-0 rounded-full border-2 transition-colors",
                      here ? "live-dot border-brand bg-brand text-brand" : passed ? "border-brand bg-brand/40" : "border-strong bg-background group-hover:border-faint",
                    )}
                  />
                  {i < JOURNEY.length - 1 ? (
                    <SignalWire className="mx-1 w-0 flex-1" moving={here} color={passed || here ? "var(--brand)" : "var(--wire)"} />
                  ) : null}
                </span>
                <span className={cn("mt-1.5 block text-xs font-medium whitespace-nowrap transition-colors", here ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="min-h-[92px] border-t border-hairline bg-canvas/50 px-4 py-3">
        <p className="kicker">{step.who}</p>
        <p key={step.key} className="rise-in mt-1 text-[13px] leading-relaxed text-foreground/85">
          {step.text}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guard chain: click a check to see what failing it looks like.
// ---------------------------------------------------------------------------

const GUARDS = [
  {
    code: "401",
    title: "Is the credential valid?",
    when: "The key is missing, malformed or revoked.",
    body: { error: "Unauthorized" },
    fix: "Check SUCCOR_API_KEY. A revoked key can take up to a minute to stop working everywhere.",
    burns: false,
  },
  {
    code: "403",
    title: "Does the key belong to this project?",
    when: "The body's projectId isn't the project this key was created for.",
    body: { error: "API key is not authorized for this projectId" },
    fix: "Send the projectId this key belongs to.",
    burns: false,
  },
  {
    code: "402",
    title: "Is the project under budget?",
    when: "This UTC month's billed total has reached the project's cap.",
    body: { error: "Monthly budget exceeded", projectId: "my-project", month: "2026-11", monthlyBudgetUsd: 200, billedThisMonthUsd: 200.14 },
    fix: "Raise the cap or wait for the month to roll. The same requestId still works afterwards.",
    burns: false,
  },
  {
    code: "403",
    title: "Is the project active and the agent enabled?",
    when: "The project isn't approved, the agent isn't enabled for it, or the agent is paused for everyone.",
    body: { error: "Agent not enabled for this project", agentType: "quiz-generator" },
    fix: "Check the project status and which agents are enabled. Other messages here: \"Project is not active\", \"Agent temporarily disabled\".",
    burns: false,
  },
  {
    code: "200",
    title: "Have we seen this requestId?",
    when: "This project already used this requestId. Nothing new runs and nothing is billed.",
    body: { accepted: false, duplicate: true },
    fix: "Nothing to do if this was a retry. If you meant a new run, send a new requestId.",
    burns: false,
  },
  {
    code: "400",
    title: "Does the body match the agent's schema?",
    when: "A field is missing or the wrong type. issues lists them.",
    body: { error: "Invalid request body", issues: { context: ["Required"] } },
    fix: "Fix the body and send a NEW requestId: this check runs after the id was recorded, so the old one now answers as a duplicate.",
    burns: true,
  },
  {
    code: "202",
    title: "Accepted",
    when: "Saved as a durable job. The work happens from here.",
    body: { accepted: true, jobId: "6710f3c2a9d4e81b2c0f4a17", projectId: "my-project", agentType: "quiz-generator", initiatedBy: "apikey:<key id>" },
    fix: "Store jobId. Wait for the callback, or poll.",
    burns: false,
  },
];

export function GuardChain() {
  const [open, setOpen] = useState(0);
  const g = GUARDS[open]!;
  return (
    <div className="tile my-5 grid overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <ol className="py-1.5">
        {GUARDS.map((x, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-pressed={open === i}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors",
                open === i ? "bg-raised text-foreground" : "text-muted-foreground hover:bg-raised/60 hover:text-foreground",
              )}
            >
              <span className="w-3 shrink-0 text-center font-mono text-[10px] text-faint">{i + 1}</span>
              <span
                className={cn(
                  "w-8 shrink-0 font-mono text-[11px] font-medium tabular-nums",
                  x.code === "202" ? "text-success" : x.code === "200" ? "text-info" : "text-warning",
                )}
              >
                {x.code}
              </span>
              <span className="min-w-0 truncate">{x.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="min-w-0 border-t border-border bg-canvas/50 p-3 md:border-t-0 md:border-l">
        <p className="text-[13px] leading-relaxed text-foreground/85">{g.when}</p>
        <CodeBlock className="my-2.5" code={JSON.stringify(g.body, null, 2)} lang="json" label={`HTTP ${g.code}`} />
        <p className={cn("text-xs leading-relaxed", g.burns ? "text-warning" : "text-muted-foreground")}>{g.fix}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "What happens if my endpoint answers…": pick a response, watch the attempts.
// ---------------------------------------------------------------------------

type Outcome = "delivered" | "retry" | "final";

const RESPONSES: Array<{ id: string; label: string; outcome: Outcome; note: string }> = [
  { id: "200", label: "200", outcome: "delivered", note: "Any 2xx is success. The delivery is finished and the body you return is ignored." },
  { id: "401", label: "401", outcome: "final", note: "Any other 4xx is treated as permanent and is not retried. Check your callback key: a wrong one fails every delivery this way." },
  { id: "404", label: "404", outcome: "final", note: "Final. Usually a route that doesn't exist yet, or the wrong base URL for this environment." },
  { id: "429", label: "429", outcome: "retry", note: "Treated as temporary. Retried after 5s, then 10s." },
  { id: "500", label: "500", outcome: "retry", note: "Any 5xx is treated as temporary. Retried after 5s, then 10s, then dead-lettered." },
  { id: "timeout", label: "Timeout", outcome: "retry", note: "No answer within 30s. Retried, but the first attempt may still have reached you, which is why you dedupe on X-Delivery-Id." },
  { id: "301", label: "301", outcome: "final", note: "Redirects are never followed, so a 3xx is a final failure. Point the base URL at the real address." },
];

export function DeliverySimulator() {
  const [pick, setPick] = useState("500");
  const r = RESPONSES.find((x) => x.id === pick)!;
  const attempts = r.outcome === "retry" ? 3 : 1;
  const end = { delivered: "Delivered", retry: "Dead-lettered", final: "Failed, not retried" }[r.outcome];
  const endTone = r.outcome === "delivered" ? "border-success bg-success-bg text-success" : "border-error bg-error-bg text-error";
  return (
    <div className="tile my-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2">
        <span className="text-xs text-muted-foreground">If your endpoint answers</span>
        <div role="radiogroup" aria-label="Your response" className="flex flex-wrap gap-1">
          {RESPONSES.map((x) => (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={pick === x.id}
              onClick={() => setPick(x.id)}
              className={cn(
                "h-6 rounded-[4px] border px-1.5 font-mono text-[11px] transition-colors",
                pick === x.id ? "border-brand bg-brand-muted text-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="no-scrollbar flex items-center overflow-x-auto px-4 py-5" key={pick}>
        {Array.from({ length: attempts }).map((_, i) => (
          <div key={i} className="rise-in flex items-center" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="w-24 shrink-0">
              <p className="font-mono text-[10px] text-faint">{i === 0 ? "t = 0" : i === 1 ? "+ 5s" : "+ 10s"}</p>
              <p className="mt-0.5 text-xs font-medium text-foreground">Attempt {i + 1}</p>
              <p className={cn("font-mono text-[11px]", r.outcome === "delivered" ? "text-success" : "text-warning")}>{r.label}</p>
            </div>
            <svg className="mr-3 h-3 w-12 shrink-0 overflow-visible" viewBox="0 0 48 12" aria-hidden>
              <line x1="0" y1="6" x2="48" y2="6" stroke="var(--wire)" strokeWidth="1" />
            </svg>
          </div>
        ))}
        <span className={cn("rise-in shrink-0 rounded-[4px] border px-2 py-1 text-xs font-semibold", endTone)} style={{ animationDelay: `${attempts * 90}ms` }}>
          {end}
        </span>
      </div>
      <p className="border-t border-hairline bg-canvas/50 px-4 py-2.5 text-[13px] leading-relaxed text-foreground/85">{r.note}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job state machine: click a state to see what it means and what to do.
// ---------------------------------------------------------------------------

const STATES: Record<string, { x: number; y: number; tone: string; means: string; todo: string }> = {
  queued: { x: 20, y: 74, tone: "var(--text-secondary)", means: "Saved and waiting for a worker. Also where a job returns between retries, and after it's approved.", todo: "Nothing. Workers poll about every second." },
  running: { x: 190, y: 74, tone: "var(--info)", means: "A worker holds a 30-second lease, renewed every 10 seconds, and is running the agent. If that worker dies the lease lapses and the job goes back to the queue.", todo: "Nothing. Finished steps are checkpointed, so a retry doesn't redo them." },
  pending_approval: { x: 380, y: 14, tone: "var(--warning)", means: "A high-risk agent finished and its delivery is held for a human. Approving returns it to the queue to deliver.", todo: "An admin decides in Approvals." },
  succeeded: { x: 380, y: 74, tone: "var(--success)", means: "The agent finished and the result was billed once. This says nothing about delivery: that has its own status.", todo: "Wait for the callback, or read result from the job." },
  dead: { x: 380, y: 134, tone: "var(--error)", means: "All attempts were used. lastError holds a sanitized reason. It was not delivered.", todo: "Read the reason. Fix the input or wait out the provider, then call again with a new requestId." },
  rejected: { x: 550, y: 14, tone: "var(--error)", means: "A reviewer rejected it. The delivery was discarded, and a non-empty note became a style rule for future runs.", todo: "Nothing. Trigger a new run if you still want the result." },
};

const ARROWS: Array<{ from: string; to: string; d: string; label?: string; lx?: number; ly?: number; soft?: boolean }> = [
  { from: "queued", to: "running", d: "M144,92 H190", label: "claimed", lx: 167, ly: 85 },
  { from: "running", to: "pending_approval", d: "M314,84 C345,84 350,32 380,32" },
  { from: "running", to: "succeeded", d: "M314,92 H380" },
  { from: "running", to: "dead", d: "M314,100 C345,100 350,152 380,152" },
  { from: "running", to: "queued", d: "M252,110 C252,146 82,146 82,110", label: "retry, with backoff", lx: 167, ly: 158, soft: true },
  { from: "pending_approval", to: "queued", d: "M442,14 C442,-36 82,-36 82,74", label: "approved", lx: 262, ly: -14, soft: true },
  { from: "pending_approval", to: "rejected", d: "M504,32 H550", label: "rejected", lx: 527, ly: 25 },
];

export function JobStateMachine() {
  const [sel, setSel] = useState("running");
  const s = STATES[sel]!;
  return (
    <div className="tile my-5 overflow-hidden">
      <div className="overflow-x-auto px-3 pt-3">
        <svg viewBox="0 -26 680 196" className="w-full min-w-[560px]" role="group" aria-label="Job states">
          <defs>
            <marker id="sm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="var(--wire)" />
            </marker>
          </defs>
          {ARROWS.map((a) => {
            const hot = a.from === sel || a.to === sel;
            return (
              <g key={`${a.from}-${a.to}`}>
                <path d={a.d} fill="none" stroke={hot ? "var(--brand)" : "var(--wire)"} strokeWidth={hot ? 1.5 : 1.1} markerEnd="url(#sm-arrow)" strokeDasharray={a.soft ? "4 4" : undefined} />
                {a.label ? (
                  <text x={a.lx} y={a.ly} textAnchor="middle" fontSize="9.5" fontFamily="var(--font-geist-mono)" fill="var(--text-tertiary)">
                    {a.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {Object.entries(STATES).map(([name, st]) => (
            <g
              key={name}
              role="button"
              tabIndex={0}
              aria-pressed={sel === name}
              onClick={() => setSel(name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSel(name);
                }
              }}
              className="cursor-pointer outline-none"
            >
              <rect
                x={st.x}
                y={st.y}
                width="124"
                height="36"
                rx="6"
                fill={sel === name ? "var(--raised)" : "var(--surface)"}
                stroke={sel === name ? st.tone : "var(--border-strong)"}
                strokeWidth={sel === name ? 1.5 : 1}
              />
              <circle cx={st.x + 12} cy={st.y + 18} r="3" fill={st.tone} />
              <text x={st.x + 21} y={st.y + 22} fontSize="10.5" fontFamily="var(--font-geist-mono)" fill="var(--foreground)">
                {name}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="border-t border-hairline bg-canvas/50 px-4 py-3">
        <p className="font-mono text-xs font-medium" style={{ color: s.tone }}>
          {sel}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{s.means}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">What to do: </span>
          {s.todo}
        </p>
      </div>
    </div>
  );
}
