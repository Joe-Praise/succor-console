"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Motion token table (§4.4). Motion communicates state change, not decoration.
 * Durations in seconds (GSAP convention). `instant` hover tints are CSS, not
 * GSAP — kept here for reference only.
 */
export const MOTION = {
  instant: { duration: 0.08, ease: "power1.out" }, // hover tints (CSS)
  fast: { duration: 0.15, ease: "power2.out" }, // toasts, skeleton→content
  base: { duration: 0.22, ease: "power2.out" }, // sidebar, drawers, reveals
  slow: { duration: 0.4, ease: "power3.out" }, // chart draw-in (mount only)
  enter: { duration: 0.2, ease: "back.out(1.2)" }, // modal / ⌘K entry
} as const;

export type MotionToken = keyof typeof MOTION;

/**
 * True when the user asked for reduced motion. Callers must branch on this to
 * skip counters / draw-ins and collapse durations to 0 (§4.4, non-negotiable).
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animate a number counter (first dashboard load only, §4.4). No-ops to the
 * final value under reduced motion.
 */
export function animateCounter(
  el: HTMLElement,
  to: number,
  {
    duration = 0.6,
    format = (n: number) => String(Math.round(n)),
  }: { duration?: number; format?: (n: number) => string } = {},
) {
  if (prefersReducedMotion()) {
    el.textContent = format(to);
    return;
  }
  const obj = { v: 0 };
  gsap.to(obj, {
    v: to,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = format(obj.v);
    },
  });
}

export { gsap, ScrollTrigger };
