import { cn } from "@/lib/utils";

/**
 * The Succor backdrop: dusk over layered ridgelines, relay towers with lit lanterns,
 * and a signal arcing between them. Original vector art, generated deterministically
 * (no Math.random, so server and client render the same path data).
 */

export type RidgeTone = "dusk" | "steel" | "moss" | "rust" | "plum";

interface Palette {
  sky: [string, string, string, string];
  sun: string;
  /** Far to near. */
  ridges: [string, string, string, string];
  cloud: string;
}

const PALETTES: Record<RidgeTone, Palette> = {
  dusk: {
    sky: ["#100c1a", "#2a1730", "#7a2f3d", "#f08a4b"],
    sun: "#ffb37a",
    ridges: ["#5a2a45", "#3a1c36", "#231428", "#120c18"],
    cloud: "#c8573f",
  },
  steel: {
    sky: ["#0c1120", "#141d33", "#21314f", "#3b5a7f"],
    sun: "#9cc2ee",
    ridges: ["#22314d", "#19243c", "#121a2c", "#0c101c"],
    cloud: "#4b6b94",
  },
  moss: {
    sky: ["#0b1412", "#10211d", "#1a3a31", "#3a7360"],
    sun: "#a8e3c8",
    ridges: ["#1c3a31", "#142b25", "#0f201b", "#0a1512"],
    cloud: "#4a8a74",
  },
  rust: {
    sky: ["#150e0a", "#2a1810", "#5c2d17", "#c8682c"],
    sun: "#f7b77a",
    ridges: ["#4f2715", "#371b10", "#24120b", "#150b07"],
    cloud: "#a85a2a",
  },
  plum: {
    sky: ["#0f0b1a", "#1b1330", "#352258", "#6e4a9e"],
    sun: "#c9aef2",
    ridges: ["#34235a", "#261a44", "#1a1230", "#110c1f"],
    cloud: "#6a4f9c",
  },
};

const W = 1600;
const H = 900;

/** A cheap deterministic hash so every ridge and star is stable across renders. */
function noise(i: number, seed: number): number {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function ridgePoints(baseY: number, amp: number, seed: number, step = 40): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let x = -step, i = 0; x <= W + step; x += step, i++) {
    const big = Math.sin(x / 260 + seed) * amp;
    const mid = Math.sin(x / 97 + seed * 2.3) * amp * 0.38;
    const jag = (noise(i, seed) - 0.5) * amp * 0.5;
    pts.push([x, baseY - big - mid - jag]);
  }
  return pts;
}

function ridgePath(pts: Array<[number, number]>): string {
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
  return `M${line} L${W + 80},${H} L-80,${H} Z`;
}

/** The ridge height at an x, to stand a tower on the skyline. */
function yAt(pts: Array<[number, number]>, x: number): number {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    if (x >= x0 && x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[0]![1];
}

const RIDGE_SPEC: Array<{ y: number; amp: number; seed: number }> = [
  { y: 560, amp: 54, seed: 1.7 },
  { y: 640, amp: 62, seed: 3.1 },
  { y: 730, amp: 70, seed: 5.3 },
  { y: 820, amp: 58, seed: 8.2 },
];
const RIDGES = RIDGE_SPEC.map((r) => ridgePoints(r.y, r.amp, r.seed));
const STARS = Array.from({ length: 150 }, (_, i) => ({
  x: +(noise(i, 11) * W).toFixed(1),
  y: +(noise(i, 23) * 460).toFixed(1),
  r: +(0.35 + noise(i, 37) * 0.75).toFixed(2),
  o: +(0.2 + noise(i, 41) * 0.6).toFixed(2),
  d: +(2 + noise(i, 53) * 5).toFixed(2),
  twinkle: i % 6 === 0,
}));
const CLOUDS = Array.from({ length: 9 }, (_, i) => ({
  x: +(noise(i, 61) * W).toFixed(0),
  y: +(330 + noise(i, 67) * 190).toFixed(0),
  w: +(240 + noise(i, 71) * 420).toFixed(0),
  h: +(3 + noise(i, 73) * 6).toFixed(1),
  o: +(0.06 + noise(i, 79) * 0.16).toFixed(2),
}));

/** Tower positions along the second ridge: the stations the signal relays through. */
const TOWER_X = [190, 560, 930, 1310];
const TOWERS = TOWER_X.map((x, i) => {
  const ridge = i % 2 === 0 ? RIDGES[1]! : RIDGES[0]!;
  const h = i % 2 === 0 ? 74 : 58;
  const base = yAt(ridge, x);
  return { x, base: +base.toFixed(1), top: +(base - h).toFixed(1), h, near: i % 2 === 0 };
});

function arcBetween(a: (typeof TOWERS)[number], b: (typeof TOWERS)[number]): string {
  const mx = (a.x + b.x) / 2;
  const lift = Math.min(a.top, b.top) - 58;
  return `M${a.x},${a.top} Q${mx},${lift.toFixed(1)} ${b.x},${b.top}`;
}

function Tower({ t, color, glow, id }: { t: (typeof TOWERS)[number]; color: string; glow: string; id: string }) {
  const half = t.near ? 9 : 7;
  return (
    <g>
      <path
        d={`M${t.x - half},${t.base} L${t.x},${t.top} L${t.x + half},${t.base}
            M${t.x - half * 0.72},${t.base - t.h * 0.28} L${t.x + half * 0.72},${t.base - t.h * 0.28}
            M${t.x - half * 0.45},${t.base - t.h * 0.55} L${t.x + half * 0.45},${t.base - t.h * 0.55}
            M${t.x - half * 0.72},${t.base - t.h * 0.28} L${t.x + half * 0.45},${t.base - t.h * 0.55}
            M${t.x + half * 0.72},${t.base - t.h * 0.28} L${t.x - half * 0.45},${t.base - t.h * 0.55}`}
        stroke={color}
        strokeWidth={1.4}
        fill="none"
      />
      <circle cx={t.x} cy={t.top} r={20} fill={`url(#${id}-lantern)`} className="lantern" style={{ animation: "lantern 3.4s ease-in-out infinite" }} />
      <circle cx={t.x} cy={t.top} r={2.6} fill={glow} />
    </g>
  );
}

export function NightRidge({
  tone = "dusk",
  animated = true,
  towers = true,
  className,
}: {
  tone?: RidgeTone;
  animated?: boolean;
  towers?: boolean;
  className?: string;
}) {
  const p = PALETTES[tone];
  const id = `ridge-${tone}`;
  const signal = tone === "dusk" || tone === "rust" ? "#ffb37a" : p.sun;
  return (
    <div className={cn("grain pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[0]} />
            <stop offset="0.34" stopColor={p.sky[1]} />
            <stop offset="0.6" stopColor={p.sky[2]} />
            <stop offset="0.78" stopColor={p.sky[3]} />
          </linearGradient>
          <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={p.sun} stopOpacity="0.95" />
            <stop offset="0.28" stopColor={p.sun} stopOpacity="0.42" />
            <stop offset="1" stopColor={p.sun} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-lantern`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={signal} stopOpacity="0.9" />
            <stop offset="1" stopColor={signal} stopOpacity="0" />
          </radialGradient>
          {p.ridges.map((c, i) => (
            <linearGradient key={i} id={`${id}-r${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={c} />
              <stop offset="1" stopColor={p.ridges[Math.min(i + 1, 3)]} />
            </linearGradient>
          ))}
          <filter id={`${id}-soft`} x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        <rect width={W} height={H} fill={`url(#${id}-sky)`} />

        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#fff"
            opacity={s.o}
            className={s.twinkle ? "twinkle" : undefined}
            style={animated && s.twinkle ? { animation: `twinkle ${s.d}s ease-in-out infinite` } : undefined}
          />
        ))}

        <circle cx={W * 0.62} cy={590} r={340} fill={`url(#${id}-sun)`} />

        <g filter={`url(#${id}-soft)`}>
          {CLOUDS.map((c, i) => (
            <rect key={i} x={c.x - c.w / 2} y={c.y} width={c.w} height={c.h} rx={c.h / 2} fill={p.cloud} opacity={c.o} />
          ))}
        </g>

        <path d={ridgePath(RIDGES[0]!)} fill={`url(#${id}-r0)`} />
        {towers ? <Tower t={TOWERS[1]!} color={p.ridges[2]} glow={signal} id={id} /> : null}
        {towers ? <Tower t={TOWERS[3]!} color={p.ridges[2]} glow={signal} id={id} /> : null}
        <path d={ridgePath(RIDGES[1]!)} fill={`url(#${id}-r1)`} />
        {towers ? <Tower t={TOWERS[0]!} color={p.ridges[3]} glow={signal} id={id} /> : null}
        {towers ? <Tower t={TOWERS[2]!} color={p.ridges[3]} glow={signal} id={id} /> : null}

        {towers
          ? TOWERS.slice(0, -1).map((t, i) => (
              <path
                key={i}
                d={arcBetween(t, TOWERS[i + 1]!)}
                stroke={signal}
                strokeWidth={1.2}
                strokeOpacity={0.7}
                fill="none"
                className={animated ? "signal-flow" : "signal-idle"}
              />
            ))
          : null}

        <path d={ridgePath(RIDGES[2]!)} fill={`url(#${id}-r2)`} />
        <path d={ridgePath(RIDGES[3]!)} fill={`url(#${id}-r3)`} />
      </svg>
    </div>
  );
}
