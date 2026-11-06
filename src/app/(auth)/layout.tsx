import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
import { NightRidge } from "@/components/illustrations/night-ridge";

const STATIONS = ["Accepted", "Working", "Reviewed", "Delivered"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh flex-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-h-svh flex-col px-6 py-6 sm:px-10">
        <Link href="/" className="flex w-fit items-center gap-2" aria-label={BRAND_NAME}>
          <BrandMark size={24} />
          <span className="text-sm font-semibold tracking-tight text-foreground">{BRAND_NAME}</span>
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-90">{children}</div>
        </div>
        <p className="text-xs text-faint">Durable agents. Every run accounted for.</p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-border lg:block">
        <NightRidge tone="dusk" />
        <div className="relative z-10 flex h-full flex-col justify-start p-12">
          <p className="display max-w-md text-[40px] text-white">Every request reaches the end of the line.</p>
          <ol className="mt-8 flex max-w-md items-center">
            {STATIONS.map((s, i) => (
              <li key={s} className="flex flex-1 items-center last:flex-none">
                <span className="flex flex-col items-center gap-2">
                  <span className="size-2 rounded-full bg-white shadow-[0_0_10px_2px_rgb(255_179_122/0.7)]" />
                </span>
                {i < STATIONS.length - 1 ? <span className="mx-1 h-px flex-1 bg-white/35" /> : null}
              </li>
            ))}
          </ol>
          <ol className="mt-2 flex max-w-md justify-between font-mono text-[11px] text-white/70">
            {STATIONS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
