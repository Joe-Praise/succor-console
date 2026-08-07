"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * The signature hero visual: the real request lifecycle, animated.
 *   POST /agents/<type> → 202 Accepted → agent runs (tokens metered)
 *   → PUT https://yourapp.com/api/agent-callback ✓
 * Literal, technical, credible — no robots, no orbs. Loops gently; renders the
 * completed state statically under reduced motion.
 */
export function LifecycleDiagram() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(prefersReducedMotion() ? 3 : 0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.4 });
    tl.call(() => setStage(0))
      .call(() => setStage(1), undefined, 0.6)
      .call(() => setStage(2), undefined, 1.6)
      .call(() => setStage(3), undefined, 3.2);
    return () => {
      tl.kill();
    };
  }, []);

  const status = stage >= 3 ? "completed" : stage >= 2 ? "running" : "queued";

  return (
    <div
      ref={rootRef}
      className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
      aria-label="How a request flows: POST, 202 accepted, agent runs, result delivered to your callback"
    >
      {/* Step rail */}
      <ol className="space-y-2.5 font-mono text-xs sm:text-sm">
        <Step active={stage >= 0} done={stage >= 1}>
          <span className="text-brand">POST</span> /agents/seo-page-factory
        </Step>
        <Step active={stage >= 1} done={stage >= 2}>
          <span className="text-success">202</span> Accepted — we take it from here
        </Step>
        <Step active={stage >= 2} done={stage >= 3} pulse={stage === 2}>
          agent running · tokens metered{stage === 2 ? <Ticker /> : null}
        </Step>
        <Step active={stage >= 3} done={stage >= 3}>
          <span className="text-brand">PUT</span> yourapp.com/api/agent-callback{" "}
          {stage >= 3 ? <CheckIcon className="inline size-3.5 text-success" aria-hidden /> : null}
        </Step>
      </ol>

      {/* Payload card */}
      <div className="mt-5 rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed">
        <p className="text-faint">{"{"}</p>
        <p className="pl-4 text-muted-foreground">
          &quot;requestId&quot;: <span className="text-foreground">&quot;run_8fk2…&quot;</span>,
        </p>
        <p className="pl-4 text-muted-foreground">
          &quot;status&quot;:{" "}
          <span
            className={cn(
              "transition-colors",
              status === "completed" ? "text-success" : status === "running" ? "text-warning" : "text-info",
            )}
          >
            &quot;{status}&quot;
          </span>
          ,
        </p>
        <p className="pl-4 text-muted-foreground">
          &quot;billed&quot;:{" "}
          <span className="text-foreground">{stage >= 3 ? "\"$0.0312\"" : "\"—\""}</span>
        </p>
        <p className="text-faint">{"}"}</p>
      </div>
    </div>
  );
}

function Step({
  active,
  done,
  pulse,
  children,
}: {
  active: boolean;
  done: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all duration-300",
        active ? "border-border bg-background opacity-100" : "border-transparent opacity-35",
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors",
          done ? "bg-success" : active ? "bg-brand" : "bg-faint",
          pulse ? "animate-pulse" : "",
        )}
        aria-hidden
      />
      <span className="truncate text-muted-foreground">{children}</span>
    </li>
  );
}

function Ticker() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const obj = { v: 0 };
    const anim = gsap.to(obj, {
      v: 2431,
      duration: 1.4,
      ease: "power1.out",
      onUpdate: () => {
        el.textContent = ` · ${Math.round(obj.v).toLocaleString()} tok`;
      },
    });
    return () => {
      anim.kill();
    };
  }, []);
  return <span ref={ref} className="text-faint" />;
}
