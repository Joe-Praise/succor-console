"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboardIcon,
  BarChart3Icon,
  ReceiptIcon,
  KeyRoundIcon,
  BoxesIcon,
  SettingsIcon,
  PaletteIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
  WalletIcon,
  FolderKanbanIcon,
  ScrollTextIcon,
  FlaskConicalIcon,
  WebhookIcon,
  GaugeIcon,
  Building2Icon,
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
import { parseScope } from "@/components/app-shell/app-shell";
import { useMe } from "@/features/auth/hooks";

/** Fired by any UI affordance (e.g. a topbar search box) to open the palette. */
export const OPEN_COMMAND_PALETTE = "open-command-palette";

type Nav = { label: string; href: string; icon: typeof LayoutDashboardIcon };

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

  const nav: Nav[] = [];
  if (orgId) {
    const base = `/o/${orgId}`;
    nav.push(
      { label: "Org overview", href: base, icon: LayoutDashboardIcon },
      { label: "Projects", href: `${base}/projects`, icon: FolderKanbanIcon },
      { label: "Team", href: `${base}/team`, icon: UsersIcon },
      { label: "Billing", href: `${base}/billing`, icon: WalletIcon },
      { label: "Org settings", href: `${base}/settings`, icon: SettingsIcon },
    );
    if (projectId) {
      const p = `${base}/p/${projectId}`;
      nav.push(
        { label: "Project overview", href: p, icon: GaugeIcon },
        { label: "Usage", href: `${p}/usage`, icon: BarChart3Icon },
        { label: "API keys", href: `${p}/keys`, icon: KeyRoundIcon },
        { label: "Agents", href: `${p}/agents`, icon: BoxesIcon },
        { label: "Callbacks", href: `${p}/callbacks`, icon: WebhookIcon },
        { label: "Logs", href: `${p}/logs`, icon: ScrollTextIcon },
        { label: "Playground", href: `${p}/playground`, icon: FlaskConicalIcon },
        { label: "Invoices", href: `${p}/invoices`, icon: ReceiptIcon },
      );
    }
  } else {
    nav.push({ label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon });
    for (const o of me?.orgs ?? []) {
      nav.push({ label: o.name, href: `/o/${o.orgId}`, icon: Building2Icon });
    }
  }
  if (me?.isPlatformAdmin) {
    nav.push({ label: "Admin", href: "/admin", icon: GaugeIcon });
  }
  nav.push({ label: "Design system", href: "/design", icon: PaletteIcon });

  function go(item: Nav) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {nav.map((item) => (
            <CommandItem key={item.href} onSelect={() => go(item)}>
              <item.icon />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
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
