"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion, ScrollTrigger } from "@/lib/gsap";

export interface SpineSection {
  id: string;
  label: string;
  /** Accent for the section's kicker chip and station, as a CSS color. */
  color: string;
  /** Background tint of its panel. */
  tint: string;
}

/**
 * The signal running down the page. A line sits behind every section; as you scroll, the lit
 * part follows you and a bright head carries the signal from station to station. A dock at
 * the bottom shows which station you're at. With reduced motion the line simply stays lit.
 */
export function SignalSpine({ sections, children }: { sections: SpineSection[]; children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [showDock, setShowDock] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion()) {
      if (fillRef.current) fillRef.current.style.height = "100%";
      return;
    }
    const ctx = gsap.context(() => {
      const progress = { p: 0 };
      gsap.to(progress, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top 45%",
          end: "bottom 55%",
          scrub: 0.5,
          onToggle: (self) => setShowDock(self.isActive),
        },
        onUpdate: () => {
          const pct = `${progress.p * 100}%`;
          if (fillRef.current) fillRef.current.style.height = pct;
          if (headRef.current) headRef.current.style.top = pct;
        },
      });
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setActive(s.id);
          },
        });
      }
    }, root);
    return () => ctx.revert();
  }, [sections]);

  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div ref={rootRef} className="relative">
      {/* The line sits at the left gutter of every panel. */}
      <div className="pointer-events-none absolute inset-y-0 left-6 z-10 hidden w-px lg:left-[max(2.5rem,calc((100vw-1240px)/2-1.5rem))] lg:block" aria-hidden>
        <div className="absolute inset-0 bg-white/12" />
        <div ref={fillRef} className="absolute inset-x-0 top-0 h-0" style={{ background: `linear-gradient(to bottom, transparent, ${current?.color ?? "var(--brand)"})` }} />
        <div ref={headRef} className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: current?.color, boxShadow: `0 0 16px 4px ${current?.color}` }} />
      </div>

      {children}

      <nav
        aria-label="Sections"
        className={cn(
          "no-scrollbar fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-surface/90 p-1 shadow-xl backdrop-blur transition-all duration-300",
          showDock ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? "true" : undefined}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
              active === s.id ? "bg-raised text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="size-1.5 rounded-full" style={{ background: active === s.id ? s.color : "var(--wire)" }} aria-hidden />
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
