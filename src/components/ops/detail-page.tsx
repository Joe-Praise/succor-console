"use client";

import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/query-error";
import { ApiError } from "@/api/client";
import { Breadcrumbs, FactGrid, IdChip, type Fact } from "@/components/ops/primitives";

/**
 * The shell every single-record page uses, so detail pages look and behave the
 * same: breadcrumbs back to the list, a compact header (title, id, status,
 * actions), a fact grid, the body, and an optional "related records" rail.
 */
export function DetailPage({
  breadcrumbs,
  eyebrow,
  title,
  id,
  status,
  actions,
  facts,
  aside,
  children,
  className,
}: {
  breadcrumbs: Array<{ label: string; href?: string }>;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  id?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  facts?: Fact[];
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <Breadcrumbs items={breadcrumbs} />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? <p className="kicker">{eyebrow}</p> : null}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[17px] leading-6 font-semibold tracking-tight text-foreground">{title}</h1>
            {id ? <IdChip id={id} /> : null}
          </div>
          {status ? <div className="pt-0.5">{status}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {facts && facts.length ? (
        <div className="tile p-4">
          <FactGrid facts={facts} />
        </div>
      ) : null}
      {aside ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6">{children}</div>
          <aside className="space-y-4">{aside}</aside>
        </div>
      ) : (
        <div className="space-y-6">{children}</div>
      )}
    </div>
  );
}

/** Loading / not-found / error states for a detail page (a helper, not a component — no hooks). */
export function renderDetailState({
  query,
  backHref,
  backLabel,
  noun,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  backHref: string;
  backLabel: string;
  noun: string;
}): React.ReactNode | null {
  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : null;
    if (status === 404) {
      return <DetailNotFound backHref={backHref} backLabel={backLabel} noun={noun} />;
    }
    if (status === 403) {
      return (
        <EmptyState
          title="You don't have access to this"
          description={`Your role in this project can't view this ${noun}.`}
          action={<Button size="sm" variant="outline" render={<Link href={backHref}>{backLabel}</Link>} />}
        />
      );
    }
    return <QueryError message={`Couldn't load this ${noun}.`} onRetry={() => void query.refetch()} />;
  }
  return null;
}

export function DetailNotFound({ backHref, backLabel, noun }: { backHref: string; backLabel: string; noun: string }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={SearchXIcon}
        title={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} not found`}
        description={`It doesn't exist, it expired, or it belongs to a project you can't see.`}
        action={<Button size="sm" variant="outline" render={<Link href={backHref}>{backLabel}</Link>} />}
      />
    </div>
  );
}
