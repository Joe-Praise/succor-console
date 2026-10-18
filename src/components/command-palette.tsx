"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboardIcon,
  PaletteIcon,
  MoonIcon,
  SunIcon,
    Building2Icon,
  SparklesIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
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
  const router = useRouter();
  const pathname = usePathname();
  const { data: me } = useMe();
  const { resolvedTheme, setTheme } = useTheme();

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
    router.push(item.href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
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
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
            Toggle theme
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
