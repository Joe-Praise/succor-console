"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppTheme } from "@/providers/theme-provider";
import {
  LayoutDashboardIcon,
  PaletteIcon,
  MoonIcon,
  SunIcon,
    Building2Icon,
  SparklesIcon,
  ActivityIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { ADMIN_NAV, orgNav, parseScope, projectNavGroups, type NavItem } from "@/lib/nav";
import { ORG_ROLE_RANK, type OrgRole } from "@/lib/permissions";
import { useMe } from "@/features/auth/hooks";

/** Fired by any UI affordance (e.g. a topbar search box) to open the palette. */
export const OPEN_COMMAND_PALETTE = "open-command-palette";

type Nav = { label: string; href: string; icon: typeof LayoutDashboardIcon; hint?: string; group: string };

/**
 * Command palette (§4.5) — navigation + actions, recognition over recall.
 * Nav entries are scope-aware: inside /o/[orgId](/p/[projectId]) they deep-link
 * into the active org/project. Opens on ⌘K / Ctrl-K (a keyboard listener — the
 * only sanctioned useEffect use, §11) or the `open-command-palette` event.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useMe();
  const { theme: resolvedTheme, forced: themeForced, setTheme } = useAppTheme();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, []);

  const { orgId, projectId } = parseScope(pathname);

  // Scope-aware entries straight from lib/nav — the same IA as the sidebar.
  const role: OrgRole = me?.orgs.find((o) => o.orgId === orgId)?.role ?? "owner";
  const allowed = (i: NavItem) => !i.minRole || ORG_ROLE_RANK[role] >= ORG_ROLE_RANK[i.minRole];
  const nav: Nav[] = [];
  if (orgId) {
    for (const i of orgNav(orgId).filter(allowed)) nav.push({ ...i, label: `Org · ${i.label}`, group: "Organization" });
    if (projectId) {
      for (const g of projectNavGroups(orgId, projectId)) {
        for (const i of g.items.filter(allowed)) nav.push({ ...i, group: g.label ? `Project · ${g.label}` : "Project" });
      }
    }
  } else {
    nav.push({ label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon, group: "Navigation" });
    for (const o of me?.orgs ?? []) {
      nav.push({ label: o.name, href: `/o/${o.orgId}`, icon: Building2Icon, group: "Navigation" });
    }
  }
  if (me?.isPlatformAdmin) {
    for (const i of ADMIN_NAV) nav.push({ ...i, label: `Admin · ${i.label}`, group: "Admin" });
  }
  nav.push(
    { label: "What the platform can do", href: "/platform", icon: SparklesIcon, group: "Reference" },
    { label: "Design system", href: "/design", icon: PaletteIcon, group: "Reference" },
  );
  const groups = [...new Set(nav.map((n) => n.group))];

  function go(item: Nav) {
    setOpen(false);
    setSearch("");
    router.push(item.href);
  }

  // Paste a job id from a 202 response (or a log line) to jump straight to the run.
  const runId = /^[a-f0-9]{24}$/i.test(search.trim()) ? search.trim() : null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={projectId ? "Search, or paste a job ID…" : "Search or jump to…"}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {runId && orgId && projectId ? (
          <CommandGroup heading="Run">
            <CommandItem
              forceMount
              value={`open run ${runId}`}
              onSelect={() =>
                go({ label: "Open run", href: `/o/${orgId}/p/${projectId}/runs/${runId}`, icon: ActivityIcon, group: "Run" })
              }
            >
              <ActivityIcon />
              <span>Open run</span>
              <span className="ml-auto font-mono text-xs text-faint">{runId}</span>
            </CommandItem>
          </CommandGroup>
        ) : null}
        {groups.map((g) => (
          <CommandGroup key={g} heading={g}>
            {nav
              .filter((item) => item.group === g)
              .map((item) => (
                <CommandItem key={item.href} value={`${item.label} ${item.hint ?? ""}`} onSelect={() => go(item)}>
                  <item.icon />
                  <span>{item.label}</span>
                  {item.hint ? (
                    <span className="ml-auto truncate pl-3 text-xs text-faint">{item.hint}</span>
                  ) : null}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        {themeForced ? null : (
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
                setOpen(false);
              }}
            >
              {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
              {resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
