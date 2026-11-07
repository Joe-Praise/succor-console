import { cn } from "@/lib/utils";

/**
 * A straight wire between two stations: a solid hairline, with a lit packet travelling it
 * while work is moving. Colour comes from `color`, so the packet always matches its wire.
 */
export function SignalWire({ moving, color = "var(--wire)", className }: { moving?: boolean; color?: string; className?: string }) {
  return <span className={cn("signal-wire", className)} data-moving={moving ? "true" : undefined} style={{ color }} aria-hidden />;
}

const COMET = [
  { r: 2.4, opacity: 1, lead: 0.11 },
  { r: 1.7, opacity: 0.5, lead: 0.055 },
  { r: 1.1, opacity: 0.25, lead: 0 },
];

/** The same signal on a curved SVG path: a small comet that eases along it, rests, and goes again. */
export function SignalComet({ path, color, dur = 2.8 }: { path: string; color: string; dur?: number }) {
  return (
    <>
      {COMET.map((c) => (
        <circle key={c.r} r={c.r} fill={color} opacity={c.opacity} className="signal-pulse">
          <animateMotion
            dur={`${dur}s`}
            begin={`-${c.lead}s`}
            repeatCount="indefinite"
            path={path}
            calcMode="spline"
            keyPoints="0;1;1"
            keyTimes="0;0.72;1"
            keySplines="0.5 0 0.25 1;0 0 1 1"
          />
        </circle>
      ))}
    </>
  );
}
