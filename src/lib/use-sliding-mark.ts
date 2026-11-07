"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Keeps a mark (an underline, a pill) sitting on whichever child matches `selector`. CSS on
 * the mark does the sliding. The very first placement skips the transition, so a page load
 * doesn't show it flying in from the corner.
 */
export function useSlidingMark(
  boxRef: RefObject<HTMLElement | null>,
  markRef: RefObject<HTMLElement | null>,
  selector: string,
  activeKey: string | null,
  inset = 0,
) {
  const placed = useRef(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const mark = markRef.current;
    if (!box || !mark) return;
    const place = () => {
      const el = box.querySelector<HTMLElement>(selector);
      if (!el) {
        mark.style.opacity = "0";
        return;
      }
      if (!placed.current) mark.style.transition = "none";
      mark.style.opacity = "1";
      mark.style.width = `${el.offsetWidth - inset * 2}px`;
      mark.style.transform = `translateX(${el.offsetLeft + inset}px)`;
      if (!placed.current) {
        void mark.offsetWidth;
        mark.style.transition = "";
        placed.current = true;
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, [boxRef, markRef, selector, activeKey, inset]);
}
