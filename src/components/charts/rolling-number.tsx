"use client";

import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A formatted value whose digits roll to their new position, on arrival and on every change.
 * Works on the display string ("$68.42", "1.2K"), so it never reformats what it's given.
 */
export function RollingNumber({ value, className }: { value: string; className?: string }) {
  const chars = [...value];
  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className={cn("rolling")}>
        {chars.map((c, i) => {
          // Keyed from the right, so the ones column stays the ones column as the number grows.
          const place = chars.length - i;
          return /\d/.test(c) ? (
            <span key={`d${place}`} className="rolling-reel">
              <span className="rolling-track" style={{ "--digit": Number(c), "--place": place } as React.CSSProperties}>
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={`c${place}${c}`} className="whitespace-pre">
              {c}
            </span>
          );
        })}
      </span>
    </span>
  );
}
