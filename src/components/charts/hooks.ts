"use client";

import { useCallback, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";

import { gsap, prefersReducedMotion } from "@/lib/gsap";

/** An id that's safe inside url(#…), which React's useId output isn't. */
export function svgId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "");
}

/** The element's live width. Charts draw in real pixels so line weight never stretches. */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((el: T | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const channels = new Map<string, { value: string | null; listeners: Set<() => void> }>();

function channel(id: string) {
  let c = channels.get(id);
  if (!c) {
    c = { value: null, listeners: new Set() };
    channels.set(id, c);
  }
  return c;
}

/** Charts sharing an id share a crosshair: hover a day in one and every chart marks that day. */
export function useChartSync(id: string | undefined) {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!id) return () => {};
      const c = channel(id);
      c.listeners.add(cb);
      return () => {
        c.listeners.delete(cb);
      };
    },
    [id],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => (id ? channel(id).value : null),
    () => null,
  );
  const set = useCallback(
    (v: string | null) => {
      if (!id) return;
      const c = channel(id);
      if (c.value === v) return;
      c.value = v;
      c.listeners.forEach((l) => l());
    },
    [id],
  );
  return [value, set] as const;
}

/**
 * Runs once when the element first scrolls into view, so a chart below the fold still gets
 * its entrance. The start callback hides what it's about to reveal, before the first paint.
 */
export function useOnFirstView(
  ref: RefObject<Element | null>,
  ready: boolean,
  prepare: () => void,
  play: () => () => void,
  reset: () => void,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !ready || prefersReducedMotion()) return;
    prepare();
    let stop: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        stop = play();
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
      reset();
    };
    // The callbacks close over refs only; this should run once, when the chart first exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}

/** Sweep a clip rect open from the left: the whole plot draws itself in, gaps and all. */
export function useReveal(svgRef: RefObject<SVGSVGElement | null>, rectRef: RefObject<SVGRectElement | null>, ready: boolean, duration = 0.95) {
  useOnFirstView(
    svgRef,
    ready,
    () => rectRef.current?.setAttribute("width", "0"),
    () => {
      const rect = rectRef.current;
      const svg = svgRef.current;
      if (!rect || !svg) return () => {};
      const tween = gsap.to(rect, { attr: { width: svg.clientWidth + 16 }, duration, ease: "power2.inOut" });
      return () => tween.kill();
    },
    () => rectRef.current?.setAttribute("width", "100000"),
  );
}
