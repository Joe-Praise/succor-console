/**
 * One set of display formatters for the whole console. Before this file each page
 * carried its own `usd()`, duration and id-truncation variants, and per-run costs
 * (fractions of a cent) rendered as "$0.00".
 */

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Money totals: always two decimals ($12.40). */
export function usd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return USD.format(n);
}

/**
 * Per-run / per-record money: enough precision that sub-cent charges are visible
 * ($0.0021), never more than 6 decimals, two decimals once it's a dollar or more.
 */
export function usdPrecise(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "$0.00";
  if (abs >= 1) return USD.format(n);
  const digits = abs >= 0.01 ? 4 : 6;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.min(digits, 4),
    maximumFractionDigits: digits,
  });
}

/** Axis labels for money: as short as the value allows ($8, $2.50, $1.2K). */
export function usdAxis(n: number): string {
  if (Math.abs(n) >= 1000) return `$${compactNumber(n)}`;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}

/** Axis labels for a duration stop: 300ms, 10s, 3m. */
export function durationAxis(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}

/** Compact integers: 1,204 · 3.9K · 1.67M. */
export function compactNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) < 10_000) return Math.round(n).toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

export function tokens(n: number | null | undefined): string {
  return compactNumber(n);
}

/** Durations from milliseconds: 840 ms · 12.4 s · 3m 05s · 2h 14m. */
export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(2) : s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  if (m < 60) return `${m}m ${String(rs).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

/** Elapsed between two instants, or null when either is missing. */
export function elapsedMs(from: Date | string | null | undefined, to: Date | string | null | undefined): number | null {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, b - a);
}

/** Short, recognizable id: the last 8 characters, prefixed with an ellipsis. */
export function shortId(id: string | null | undefined, n = 8): string {
  if (!id) return "—";
  return id.length <= n ? id : `…${id.slice(-n)}`;
}

/** Absolute timestamp for tables: "Oct 18, 14:32:01". */
export function dateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Millisecond-precision clock for timelines: "14:32:01.234". */
export function clockTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (v: number, l = 2) => String(v).padStart(l, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** "3 min ago", "2 h ago", "yesterday", else a date. `now` is injectable for tests. */
export function relativeTime(d: Date | string | null | undefined, now: number = Date.now()): string {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Math.round((now - t) / 1000);
  if (diff < 0) return "just now";
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} min ago`;
  if (diff < 86_400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 172_800) return "yesterday";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** A ratio as a percentage with one decimal: 0.9765 → "97.7%". */
export function percent(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Signed change between two values, as a ratio, or null when undefined/infinite. */
export function delta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / previous;
}
