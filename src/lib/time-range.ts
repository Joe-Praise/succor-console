/**
 * Relative time ranges for ops views. "now" is rounded down to the minute so a range
 * yields a STABLE query key between renders instead of refetching every millisecond.
 */

export const RANGE_PRESETS = [
  { key: "24h", label: "24h", ms: 24 * 3_600_000 },
  { key: "7d", label: "7d", ms: 7 * 86_400_000 },
  { key: "30d", label: "30d", ms: 30 * 86_400_000 },
  { key: "90d", label: "90d", ms: 90 * 86_400_000 },
] as const;

export type RangeKey = (typeof RANGE_PRESETS)[number]["key"];

export function isRangeKey(v: string): v is RangeKey {
  return RANGE_PRESETS.some((p) => p.key === v);
}

export function floorToMinute(t: number): number {
  return Math.floor(t / 60_000) * 60_000;
}

export interface Bounds {
  from: string;
  to: string;
  ms: number;
}

/** The [from, to] ISO bounds for a preset, ending at `now` (rounded to the minute). */
export function rangeBounds(key: RangeKey, now: number): Bounds {
  const preset = RANGE_PRESETS.find((p) => p.key === key) ?? RANGE_PRESETS[1];
  const to = floorToMinute(now);
  return { from: new Date(to - preset.ms).toISOString(), to: new Date(to).toISOString(), ms: preset.ms };
}

/** The equal-length window immediately before `b` — for "vs previous period". */
export function previousBounds(b: Bounds): Bounds {
  const to = new Date(b.from).getTime();
  return { from: new Date(to - b.ms).toISOString(), to: new Date(to).toISOString(), ms: b.ms };
}

/** "YYYY-MM-DD" for the usage API (date-granular bounds). */
export function isoDay(iso: string): string {
  return iso.slice(0, 10);
}
