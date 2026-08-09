"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboardIcon,
  BarChart3Icon,
  ReceiptIcon,
  KeyRoundIcon,
  BoxesIcon,
  SettingsIcon,
  GaugeIcon,
  FolderKanbanIcon,
  InboxIcon,
  WalletIcon,
  UsersIcon,
  ScrollTextIcon,
  BookOpenIcon,
  MenuIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  CommandIcon,
  CheckIcon,
  Building2Icon,
  WebhookIcon,
  FlaskConicalIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { ORG_ROLE_RANK, type OrgRole } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import {
  CommandPalette,
  OPEN_COMMAND_PALETTE,
} from "@/components/command-palette";
import { useMe, useLogout } from "@/features/auth/hooks";
import type { Me, OrgRef } from "@/types";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Minimum org role to SEE this item (billing is hidden from developers). */
  minRole?: OrgRole;
};

/** Parse /o/[orgId](/p/[projectId])?/… into scope. */
export function parseScope(pathname: string): { orgId: string | null; projectId: string | null } {
  const m = /^\/o\/([^/]+)(?:\/p\/([^/]+))?/.exec(pathname);
  return { orgId: m?.[1] ?? null, projectId: m?.[2] ?? null };
}

function orgNav(orgId: string): NavItem[] {
  const base = `/o/${orgId}`;
  return [
    { label: "Overview", href: base, icon: LayoutDashboardIcon, exact: true },
    { label: "Projects", href: `${base}/projects`, icon: FolderKanbanIcon },
    { label: "Team", href: `${base}/team`, icon: UsersIcon },
    { label: "Billing", href: `${base}/billing`, icon: WalletIcon, minRole: "admin" },
    { label: "Settings", href: `${base}/settings`, icon: SettingsIcon },
  ];
}

function projectNav(orgId: string, projectId: string): NavItem[] {
  const base = `/o/${orgId}/p/${projectId}`;
  return [
    { label: "Overview", href: base, icon: GaugeIcon, exact: true },
    { label: "Usage", href: `${base}/usage`, icon: BarChart3Icon },
    { label: "API keys", href: `${base}/keys`, icon: KeyRoundIcon },
    { label: "Agents", href: `${base}/agents`, icon: BoxesIcon },
    { label: "Docs", href: `${base}/docs`, icon: BookOpenIcon },
    { label: "Callbacks", href: `${base}/callbacks`, icon: WebhookIcon },
    { label: "Logs", href: `${base}/logs`, icon: ScrollTextIcon },
    { label: "Playground", href: `${base}/playground`, icon: FlaskConicalIcon },
    { label: "Invoices", href: `${base}/invoices`, icon: ReceiptIcon, minRole: "admin" },
    { label: "Settings", href: `${base}/settings`, icon: SettingsIcon },
  ];
}

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: GaugeIcon, exact: true },
  { label: "Organizations", href: "/admin/orgs", icon: Building2Icon },
  { label: "Projects", href: "/admin/projects", icon: FolderKanbanIcon },
  { label: "Requests", href: "/admin/requests", icon: InboxIcon },
  { label: "Billing", href: "/admin/billing", icon: WalletIcon },
  { label: "Users", href: "/admin/users", icon: UsersIcon },
  { label: "Logs", href: "/admin/logs", icon: ScrollTextIcon },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavList({ me, onNavigate }: { me: Me; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { orgId, projectId } = parseScope(pathname);
  const org = orgId ? me.orgs.find((o) => o.orgId === orgId) ?? null : null;
  // Platform admins act as org owners for nav purposes.
  const role: OrgRole = org?.role ?? "owner";

  const visible = (items: NavItem[]) =>
    items.filter((i) => !i.minRole || ORG_ROLE_RANK[role] >= ORG_ROLE_RANK[i.minRole]);

  // Keyed by a stable section id, NOT the display label — an org and a project
  // can share a name (e.g. both called "EduCourse").
  const section = (id: string, label: string, items: NavItem[]) => (
    <div className="space-y-1" key={id}>
      <p className="truncate px-3 pb-1 text-xs font-medium text-faint">{label}</p>
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-muted text-brand"
                : "text-muted-foreground hover:bg-raised hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-4 shrink-0", active ? "text-brand" : "text-faint")} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  const sections: React.ReactNode[] = [];
  if (orgId && (org || me.isPlatformAdmin)) {
    sections.push(section("org", org?.name ?? orgId, visible(orgNav(orgId))));
    if (projectId) {
      const project = org?.projects.find((p) => p.projectId === projectId);
      sections.push(
        section("project", project?.name ?? projectId, visible(projectNav(orgId, projectId))),
      );
    }
  } else if (!me.isPlatformAdmin) {
    // Outside an org (e.g. /dashboard) — quick links into each org.
    sections.push(
      section(
        "org-list",
        "Organizations",
        me.orgs.map((o) => ({ label: o.name, href: `/o/${o.orgId}`, icon: Building2Icon })),
      ),
    );
  }
  if (me.isPlatformAdmin) sections.push(section("admin", "Admin", ADMIN_NAV));

  return <nav className="flex flex-col gap-5 px-3 py-4">{sections}</nav>;
}

function Brand({ me }: { me: Me }) {
  const pathname = usePathname();
  const { orgId } = parseScope(pathname);
  // Members go to their org home (never the /dashboard resolver); the platform
  // admin goes to /admin. /dashboard remains only as a no-context fallback.
  const home = orgId
    ? `/o/${orgId}`
    : me.isPlatformAdmin
      ? "/admin"
      : me.orgs[0]
        ? `/o/${me.orgs[0].orgId}`
        : "/dashboard";
  return (
    <Link href={home} className="flex items-center gap-2 px-5 py-4">
      <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
        <span className="font-mono text-xs font-semibold">
          {BRAND_NAME.charAt(0).toLowerCase()}
        </span>
      </span>
      <span className="font-mono text-sm tracking-wide text-foreground">
        {BRAND_NAME.toLowerCase()}
      </span>
    </Link>
  );
}

function OrgSwitcher({ me }: { me: Me }) {
  const pathname = usePathname();
  const router = useRouter();
  const { orgId, projectId } = parseScope(pathname);
  const current = orgId ? me.orgs.find((o) => o.orgId === orgId) ?? null : null;

  if (me.orgs.length === 0 && !me.isPlatformAdmin) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push("/onboarding")}>
        <PlusIcon />
        Create organization
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="max-w-45">
              <Building2Icon className="text-faint" />
              <span className="truncate">{current?.name ?? "Organizations"}</span>
              <ChevronsUpDownIcon className="text-faint" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {me.orgs.map((o) => (
              <DropdownMenuItem
                key={o.orgId}
                onClick={() => router.push(`/o/${o.orgId}`)}
                className="justify-between"
              >
                <span className="truncate">{o.name}</span>
                {o.orgId === orgId ? <CheckIcon className="size-4 text-brand" /> : null}
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
      <span className="hidden text-faint sm:inline">/</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="hidden max-w-45 sm:inline-flex">
              <span className="truncate">{current?.name ?? "Select project"}</span>
              <ChevronsUpDownIcon className="text-faint" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Projects</DropdownMenuLabel>
            {org.projects.map((p) => (
              <DropdownMenuItem
                key={p.projectId}
                onClick={() => router.push(`/o/${org.orgId}/p/${p.projectId}`)}
                className="justify-between"
              >
                <span className="truncate">{p.name}</span>
                {p.projectId === activeProjectId ? (
                  <CheckIcon className="size-4 text-brand" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function UserMenu({ name, email }: { name: string; email: string }) {
  const logout = useLogout();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Account menu">
            <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-medium text-brand-foreground">
              {initial}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="truncate font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:block">
        <div className="p-5">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-2 px-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Expired/invalid session (cookie present but rejected) → back to login.
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (isLoading || !data) return <ShellSkeleton />;

  return (
    // Viewport-locked shell: the document never scrolls — the sidebar stays
    // put and ONLY the <main> column scrolls its own content.
    <div className="flex h-svh overflow-hidden bg-background">
      {/* desktop sidebar */}
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <Brand me={data} />
        <div className="flex-1 overflow-y-auto">
          <NavList me={data} />
        </div>
      </aside>

      {/* main column */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur">
          {/* mobile drawer */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <MenuIcon />
                </Button>
              }
            />
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="px-5 pt-4">{BRAND_NAME.toLowerCase()}</SheetTitle>
              <NavList me={data} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <OrgSwitcher me={data} />

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="hidden text-muted-foreground sm:inline-flex"
              onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
            >
              <CommandIcon />
              Search
              <kbd className="ml-1 rounded bg-raised px-1.5 font-mono text-[11px]">⌘K</kbd>
            </Button>
            <ThemeToggle />
            <UserMenu name={data.user.name} email={data.user.email} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-6 md:px-8">{children}</main>
      </div>

      <CommandPalette />
    </div>
  );
}
