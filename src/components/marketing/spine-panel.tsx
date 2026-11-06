import type { SpineSection } from "@/components/marketing/signal-spine";

/** One tinted panel on the line: chip, serif headline, lede, then whatever it shows. */
export function SpinePanel({
  section,
  chip,
  title,
  lede,
  children,
  features,
}: {
  section: SpineSection;
  chip: string;
  title: React.ReactNode;
  lede: React.ReactNode;
  children?: React.ReactNode;
  features?: Array<{ icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; body: string }>;
}) {
  return (
    <section id={section.id} className="scroll-mt-16 px-3 py-3 md:px-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/6" style={{ background: section.tint }}>
        {/* A dithered wash from the top edge, so the panel isn't a flat rectangle. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
          style={{
            backgroundImage: `radial-gradient(${section.color}26 1px, transparent 1.1px)`,
            backgroundSize: "6px 6px",
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-310 px-6 pt-20 pb-16 lg:px-20 lg:pt-28 lg:pb-24">
          <p
            className="inline-flex h-6 items-center rounded-[5px] px-2 text-xs font-medium"
            style={{ color: section.color, background: `color-mix(in oklab, ${section.color} 14%, transparent)` }}
          >
            {chip}
          </p>
          <h2 className="display mt-4 max-w-2xl text-[clamp(32px,4.4vw,48px)] text-white">{title}</h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">{lede}</p>
          {children ? <div className="mt-10">{children}</div> : null}
          {features ? (
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {features.map((f) => (
                <div key={f.title}>
                  <f.icon className="size-4.5 text-white/90" strokeWidth={1.75} />
                  <h3 className="mt-2.5 text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/60">{f.body}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
