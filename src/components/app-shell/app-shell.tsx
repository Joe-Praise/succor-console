"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDownIcon,
  LogOutIcon,
  SearchIcon,
  CheckIcon,
  PlusIcon,
  UserCogIcon,
  ShieldIcon,
  BookOpenIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ORG_ROLE_RANK, type OrgRole } from "@/lib/permissions";
import {
  ADMIN_TABS,
  isActive,
  isTabActive,
  orgTabs,
  pageLayout,
  parseScope,
  projectTabs,
  tabPages,
  type NavTab,
} from "@/lib/nav";
import { useApprovals } from "@/features/runtime/hooks";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette, OPEN_COMMAND_PALETTE } from "@/components/command-palette";
import { useMe, useLogout } from "@/features/auth/hooks";
import type { Me, OrgRef } from "@/types";

/** Re-exported for existing importers; the source of truth is lib/nav. */
export { parseScope };

const STATUS_DOT: Record<string, string> = {
  approved: "bg-success",
  pending: "bg-warning",
  suspended: "bg-error",
};

/** Live count of held deliveries — the one tab that carries a number. */
function ApprovalsCount({ projectId }: { projectId: string }) {
  const approvals = useApprovals(projectId);
  const n = approvals.data?.approvals.length ?? 0;
  if (n === 0) return null;
  return (
    <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-[3px] bg-warning-bg px-1 text-[10px] font-semibold tabular-nums text-warning">
      {n}
    </span>
  );
}

function useTabs(me: Me): { tabs: NavTab[]; role: OrgRole } {
  const pathname = usePathname();
  const { orgId, projectId } = parseScope(pathname);
  const org = orgId ? (me.orgs.find((o) => o.orgId === orgId) ?? null) : null;
  // Platform admins act as org owners for nav purposes.
  const role: OrgRole = org?.role ?? "owner";
  const allowed = (minRole?: OrgRole) => !minRole || ORG_ROLE_RANK[role] >= ORG_ROLE_RANK[minRole];

  let tabs: NavTab[] = [];
  if (pathname === "/admin" || pathname.startsWith("/admin/")) tabs = ADMIN_TABS;
  else if (orgId && projectId) tabs = projectTabs(orgId, projectId);
  else if (orgId) tabs = orgTabs(orgId);

  return {
    role,
    tabs: tabs
      .filter((t) => allowed(t.minRole))
      .map((t) => (t.items ? { ...t, items: t.items.filter((i) => allowed(i.minRole)) } : t)),
  };
}

function TabLink({ tab, active, projectId, tall }: { tab: NavTab; active: boolean; projectId: string | null; tall?: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex shrink-0 items-center px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
        tall ? "h-12" : "h-9",
        active
          ? "text-foreground after:absolute after:inset-x-2.5 after:bottom-0 after:h-px after:bg-brand"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {tab.label}
      {tab.id === "approvals" && projectId ? <ApprovalsCount projectId={projectId} /> : null}
    </Link>
  );
}

function OrgSwitcher({ me }: { me: Me }) {
  const pathname = usePathname();
  const router = useRouter();
  const { orgId, projectId } = parseScope(pathname);
  const current = orgId ? (me.orgs.find((o) => o.orgId === orgId) ?? null) : null;

  if (me.orgs.length === 0 && !me.isPlatformAdmin) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/onboarding")}>
        <PlusIcon />
        Create organization
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 items-center">
      <span className="px-1 text-faint select-none" aria-hidden>
        /
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-7 max-w-40 items-center gap-1 rounded-md px-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-raised"
            >
              <span className="truncate">{current?.name ?? (me.isPlatformAdmin ? "Platform" : "Organizations")}</span>
              <ChevronsUpDownIcon className="size-3 shrink-0 text-faint" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {me.orgs.map((o) => (
              <DropdownMenuItem key={o.orgId} onClick={() => router.push(`/o/${o.orgId}`)} className="justify-between">
                <span className="truncate">{o.name}</span>
                {o.orgId === orgId ? <CheckIcon className="size-3.5 text-brand" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/onboarding")}>
            <PlusIcon />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {current ? <ProjectPicker org={current} activeProjectId={projectId} /> : null}
    </div>
  );
}

function ProjectPicker({ org, activeProjectId }: { org: OrgRef; activeProjectId: string | null }) {
  const router = useRouter();
  const current = org.projects.find((p) => p.projectId === activeProjectId);
  if (org.projects.length === 0) return null;

  return (
    <>
      <span className="px-1 text-faint select-none" aria-hidden>
        /
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-7 max-w-44 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-raised"
            >
              {current ? (
                <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[current.status] ?? "bg-faint")} aria-hidden />
              ) : null}
              <span className={cn("truncate", !current && "text-muted-foreground")}>{current?.name ?? "Select project"}</span>
              <ChevronsUpDownIcon className="size-3 shrink-0 text-faint" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Projects</DropdownMenuLabel>
            {org.projects.map((p) => (
              <DropdownMenuItem
                key={p.projectId}
                onClick={() => router.push(`/o/${org.orgId}/p/${p.projectId}`)}
                className="justify-between"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[p.status] ?? "bg-faint")} aria-hidden />
                  <span className="truncate">{p.name}</span>
                </span>
                {p.projectId === activeProjectId ? <CheckIcon className="size-3.5 text-brand" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/o/${org.orgId}/projects?new=1`)}>
            <PlusIcon />
            New project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function UserMenu({ me }: { me: Me }) {
  const logout = useLogout();
  const router = useRouter();
  const { name, email } = me.user;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="ml-1 grid size-6 place-items-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground transition-opacity hover:opacity-85"
          >
            {initial}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">{name}</span>
            <span className="truncate font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/account")}>
          <UserCogIcon />
          Account settings
        </DropdownMenuItem>
        {me.isPlatformAdmin ? (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            <ShieldIcon />
            Platform admin
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => router.push("/docs")}>
          <BookOpenIcon />
          Documentation
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar({ me }: { me: Me }) {
  const pathname = usePathname();
  const { orgId, projectId } = parseScope(pathname);
  const { tabs } = useTabs(me);
  const activeTab = tabs.find((t) => isTabActive(pathname, t)) ?? null;
  const subPages = activeTab?.items && activeTab.items.length > 1 ? tabPages(activeTab) : null;
  const home = orgId ? `/o/${orgId}` : me.isPlatformAdmin ? "/admin" : me.orgs[0] ? `/o/${me.orgs[0].orgId}` : "/dashboard";

  return (
    <header className="z-30 shrink-0 border-b border-border bg-background">
      <div className="flex h-12 items-center gap-0.5 px-3">
        <Link href={home} className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-85" aria-label="Succor home">
          <BrandMark />
        </Link>
        <OrgSwitcher me={me} />

        {/* Tabs share the bar on wide screens and drop to their own row below that. */}
        {tabs.length ? (
          <nav aria-label="Sections" className="ml-auto hidden items-center xl:flex">
            {tabs.map((t) => (
              <TabLink key={t.id} tab={t} active={activeTab?.id === t.id} projectId={projectId} tall />
            ))}
          </nav>
        ) : null}

        <div className={cn("flex shrink-0 items-center gap-0.5 pl-3", !tabs.length && "ml-auto", tabs.length && "ml-auto xl:ml-0 xl:border-l xl:border-border")}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
            aria-label="Search"
            className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-raised hover:text-foreground sm:border sm:border-border sm:pr-1"
          >
            <SearchIcon className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded-[3px] bg-raised px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
          </button>
          <ThemeToggle />
          <UserMenu me={me} />
        </div>
      </div>

      {tabs.length ? (
        <nav aria-label="Sections" className="no-scrollbar flex items-center overflow-x-auto border-t border-hairline px-1 xl:hidden">
          {tabs.map((t) => (
            <TabLink key={t.id} tab={t} active={activeTab?.id === t.id} projectId={projectId} />
          ))}
        </nav>
      ) : null}

      {subPages ? (
        <nav aria-label={`${activeTab?.label} pages`} className="no-scrollbar flex h-9 items-center gap-0.5 overflow-x-auto border-t border-hairline px-3">
          {subPages.map((i) => {
            const active = isActive(pathname, i);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-6 shrink-0 items-center gap-1.5 rounded-[4px] px-2 text-xs font-medium whitespace-nowrap transition-colors",
                  active ? "bg-raised text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <i.icon className={cn("size-3.5", active ? "text-brand" : "text-faint")} strokeWidth={1.75} />
                {i.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex h-svh flex-col">
      <div className="flex h-12 items-center gap-3 border-b border-border px-3">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="ml-auto h-4 w-72" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-6 w-48" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Expired/invalid session (cookie present but rejected) → back to login.
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (isLoading || !data) return <ShellSkeleton />;

  const layout = pageLayout(pathname);

  return (
    // Viewport-locked shell: the document never scrolls, only <main> does.
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <TopBar me={data} />
      <main
        className={cn(
          "min-h-0 flex-1",
          layout === "canvas" ? "overflow-hidden" : "overflow-y-auto",
          layout === "page" && "px-4 py-5 md:px-6",
        )}
      >
        <TooltipProvider delay={200}>{children}</TooltipProvider>
      </main>
      <CommandPalette />
    </div>
  );
}
