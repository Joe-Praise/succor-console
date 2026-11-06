import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NightRidge, type RidgeTone } from "@/components/illustrations/night-ridge";

/** Kicker + large serif headline + optional lede — the section opener. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" ? "mx-auto text-center" : "", className)}>
      {eyebrow ? <p className="kicker text-brand!">{eyebrow}</p> : null}
      <h2 className="display text-[clamp(28px,4.2vw,44px)] text-foreground">{title}</h2>
      {lede ? <p className="text-[15px] leading-relaxed text-muted-foreground">{lede}</p> : null}
    </div>
  );
}

/** A page's opening: its headline over the night-ridge illustration. */
export function PageHero({
  eyebrow,
  title,
  lede,
  tone = "dusk",
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  tone?: RidgeTone;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-3 pt-3 md:px-4">
      <section className="relative isolate overflow-hidden rounded-3xl border border-white/6">
        <NightRidge tone={tone} />
        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-40 text-center md:pt-20 md:pb-64">
          {eyebrow ? <p className="kicker text-white/70!">{eyebrow}</p> : null}
          <h1 className="display mt-3 text-[clamp(36px,6vw,64px)] text-balance text-white">{title}</h1>
          {lede ? <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80 md:text-base">{lede}</p> : null}
          {children ? <div className="mt-7">{children}</div> : null}
        </div>
      </section>
    </div>
  );
}

/** Final call-to-action band, reused across marketing pages. */
export function CtaBand() {
  return (
    <div className="px-3 py-3 md:px-4">
      <section className="relative isolate overflow-hidden rounded-3xl border border-white/6">
        <NightRidge tone="dusk" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
          <h2 className="display text-[clamp(32px,5vw,56px)] text-white">Ship the feature. Skip the machinery.</h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/80 md:text-base">
            Create an organization, get a key, and make your first call in minutes. Pay only for what runs.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Button size="lg" render={<Link href="/register" />}>
              Start building
              <ArrowRightIcon />
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" render={<Link href="/docs" />}>
              Read the docs
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Simple FAQ accordion built on native details/summary — no JS needed. */
export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="tile mx-auto max-w-2xl divide-y divide-border">
      {items.map((item) => (
        <details key={item.q} className="group px-4 py-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
            {item.q}
            <span aria-hidden className="text-faint transition-transform duration-200 group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
