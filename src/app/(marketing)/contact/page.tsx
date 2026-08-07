import type { Metadata } from "next";
import { MailIcon, SparklesIcon, WalletIcon } from "lucide-react";

import { BRAND_NAME, BRAND_CONTACT_EMAIL } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: `Contact — ${BRAND_NAME}`,
  description: "Questions, custom agent requests, or volume pricing — talk to a human.",
};

const REASONS = [
  {
    icon: SparklesIcon,
    title: "Request a custom agent",
    body: "Tell us what it should do and what your callback should receive. We'll scope it with you and quote a flat build fee.",
  },
  {
    icon: WalletIcon,
    title: "Volume & pricing",
    body: "Running serious volume? Multipliers are adjustable per project — let's set a rate that makes sense.",
  },
  {
    icon: MailIcon,
    title: "Anything else",
    body: "Integration questions, partnership ideas, or something that doesn't fit a form. Email works.",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-10 text-center md:pt-28">
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">Contact</p>
        <h1
          className="mt-4 font-serif text-foreground"
          style={{
            fontSize: "clamp(34px, 6vw, 56px)",
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: "-0.015em",
          }}
        >
          Talk to a human.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          We read everything. Include your use case and rough volume, and you&apos;ll get a
          useful answer — not a ticket number.
        </p>
        <div className="mt-8">
          <Button size="lg" render={<a href={`mailto:${BRAND_CONTACT_EMAIL}`} />}>
            <MailIcon />
            {BRAND_CONTACT_EMAIL}
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {REASONS.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.06}>
              <div className="h-full rounded-xl border border-border bg-surface p-6">
                <r.icon className="size-5 text-brand" aria-hidden />
                <h3 className="mt-3 font-medium text-foreground">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
        <Reveal>
          <SectionHeading
            eyebrow="Prefer to just try it?"
            title="The fastest answer is an API key."
            lede="Sign up, create an organization, and run your first agent in the playground — no card required."
          />
        </Reveal>
      </section>
    </>
  );
}
