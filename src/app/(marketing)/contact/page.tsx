import type { Metadata } from "next";
import { MailIcon, SparklesIcon, WalletIcon } from "lucide-react";

import { BRAND_NAME, BRAND_CONTACT_EMAIL } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { PageHero, SectionHeading } from "@/components/marketing/section";

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
      <PageHero
        eyebrow="Contact"
        title="Talk to a human"
        lede="We read everything. Include your use case and rough volume, and you'll get a useful answer, not a ticket number."
        tone="steel"
      >
        
          <Button size="lg" render={<a href={`mailto:${BRAND_CONTACT_EMAIL}`} />}>
            <MailIcon />
            {BRAND_CONTACT_EMAIL}
          </Button>
        
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {REASONS.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.06}>
              <div className="h-full tile p-6">
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
