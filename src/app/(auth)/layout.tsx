import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2" aria-label={BRAND_NAME}>
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="font-mono text-sm font-semibold">
                {BRAND_NAME.charAt(0).toLowerCase()}
              </span>
            </span>
            <span className="font-mono text-sm tracking-wide text-foreground">
              {BRAND_NAME.toLowerCase()}
            </span>
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
