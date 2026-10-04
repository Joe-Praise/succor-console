import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Uppercase eyebrow + large serif headline + optional lede — the section opener. */
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
    <div
      className={cn(
        "max-w-2xl space-y-3",
        align === "center" ? "mx-auto text-center" : "",
        className,
      )}
    >
      {eyebrow ? (
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">{eyebrow}</p>
      ) : null}
      <h2
        className="font-serif text-foreground"
        style={{
          fontSize: "clamp(28px, 4.5vw, 40px)",
          lineHeight: 1.15,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {lede ? <p className="text-base text-muted-foreground md:text-lg">{lede}</p> : null}
    </div>
  );
}

/** Final call-to-action band, reused across marketing pages. */
export function CtaBand() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2
          className="font-serif text-foreground"
          style={{
            fontSize: "clamp(30px, 5vw, 44px)",
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          Ship the feature. Skip the machinery.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground md:text-lg">
          Create an organization, mint a key, and make your first call in under ten minutes.
          Pay only for what runs.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/register" />}>
            Get started free
            <ArrowRightIcon />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/contact" />}>
            Talk to us
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Simple FAQ accordion built on native details/summary — no JS needed. */
export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="mx-auto max-w-2xl divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              aria-hidden
              className="text-faint transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
