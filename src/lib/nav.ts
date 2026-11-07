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
  Building2Icon,
  WebhookIcon,
  FlaskConicalIcon,
  WorkflowIcon,
  ActivityIcon,
  StampIcon,
  PlugZapIcon,
  FingerprintIcon,
  IdCardIcon,
  LifeBuoyIcon,
  NetworkIcon,
  ArrowLeftRightIcon,
  LineChartIcon,
  SlidersHorizontalIcon,
  HammerIcon,
  type LucideIcon,
} from "lucide-react";

import type { OrgRole } from "@/lib/permissions";

/**
 * The console's information architecture, defined ONCE. The top bar and the ⌘K palette
 * both read from here, so a new surface can't land in one and be missed by the other.
 *
 * A scope (project, org, admin) is a row of tabs. A tab with several pages shows them
 * as a second row of sub-tabs. Routes never change when the navigation over them does.
 */

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Minimum org role to SEE this item (billing is hidden from developers). */
  minRole?: OrgRole;
  /** One-line hint shown in ⌘K. */
  hint?: string;
};

export type NavTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Where the tab goes when clicked; its first page if it has several. */
  href: string;
  exact?: boolean;
  hint?: string;
  minRole?: OrgRole;
  /** Pages under this tab, shown as sub-tabs. Omit for a single-page tab. */
  items?: NavItem[];
};

export function projectTabs(orgId: string, projectId: string): NavTab[] {
  const p = `/o/${orgId}/p/${projectId}`;
  return [
    { id: "canvas", label: "Canvas", icon: NetworkIcon, href: p, exact: true, hint: "Your request path, live" },
    { id: "runs", label: "Runs", icon: ActivityIcon, href: `${p}/runs`, hint: "Every execution: status, timeline, cost, delivery" },
    { id: "approvals", label: "Approvals", icon: StampIcon, href: `${p}/approvals`, hint: "Held deliveries awaiting review" },
    {
      id: "observe",
      label: "Observe",
      icon: LineChartIcon,
      href: `${p}/observe`,
      items: [
        { label: "Dashboard", href: `${p}/observe`, icon: GaugeIcon, exact: true, hint: "Outcomes, durations, spend, errors" },
        { label: "Requests", href: `${p}/requests`, icon: ArrowLeftRightIcon, hint: "Requests in and callbacks out, as they happen" },
        { label: "Logs", href: `${p}/logs`, icon: ScrollTextIcon, hint: "Every priced run record" },
        { label: "Callbacks", href: `${p}/callbacks`, icon: WebhookIcon, hint: "Deliveries to your API" },
        { label: "Usage", href: `${p}/usage`, icon: BarChart3Icon, hint: "Runs, tokens, cost, budget" },
      ],
    },
    {
      id: "build",
      label: "Build",
      icon: HammerIcon,
      href: `${p}/agents`,
      items: [
        { label: "Agents", href: `${p}/agents`, icon: BoxesIcon, hint: "Catalog + capabilities" },
        { label: "Workflows", href: `${p}/workflows`, icon: WorkflowIcon, hint: "Durable multi-agent pipelines" },
        { label: "Playground", href: `${p}/playground`, icon: FlaskConicalIcon, hint: "Run an agent from the browser" },
        { label: "Tools", href: `${p}/tools`, icon: PlugZapIcon, hint: "MCP servers + tool grants" },
        { label: "Profile", href: `${p}/profile`, icon: IdCardIcon, hint: "Business profile every prompt reads" },
      ],
    },
    { id: "docs", label: "Docs", icon: BookOpenIcon, href: `${p}/docs`, hint: "Guides and API reference, with your values filled in" },
    {
      id: "settings",
      label: "Settings",
      icon: SlidersHorizontalIcon,
      href: `${p}/settings`,
      items: [
        { label: "General", href: `${p}/settings`, icon: SettingsIcon, hint: "Name + callback base URLs" },
        { label: "API keys", href: `${p}/keys`, icon: KeyRoundIcon, hint: "Inbound credentials" },
        { label: "Audit", href: `${p}/audit`, icon: FingerprintIcon, hint: "Signed governance ledger" },
        { label: "Invoices", href: `${p}/invoices`, icon: ReceiptIcon, minRole: "admin", hint: "Monthly invoices" },
        { label: "Support", href: `${p}/support`, icon: LifeBuoyIcon, hint: "Open a ticket" },
      ],
    },
  ];
}

export function orgTabs(orgId: string): NavTab[] {
  const base = `/o/${orgId}`;
  return [
    { id: "overview", label: "Overview", icon: LayoutDashboardIcon, href: base, exact: true, hint: "Org home" },
    { id: "projects", label: "Projects", icon: FolderKanbanIcon, href: `${base}/projects`, hint: "Every project in this org" },
    { id: "team", label: "Team", icon: UsersIcon, href: `${base}/team`, hint: "Members, roles, invites" },
    { id: "billing", label: "Billing", icon: WalletIcon, href: `${base}/billing`, minRole: "admin", hint: "Spend + invoices across projects" },
    { id: "settings", label: "Settings", icon: SettingsIcon, href: `${base}/settings`, hint: "Org name, billing email" },
  ];
}

export const ADMIN_TABS: NavTab[] = [
  { id: "overview", label: "Overview", icon: GaugeIcon, href: "/admin", exact: true, hint: "Platform health" },
  { id: "orgs", label: "Organizations", icon: Building2Icon, href: "/admin/orgs", hint: "Approve + suspend orgs" },
  { id: "projects", label: "Projects", icon: FolderKanbanIcon, href: "/admin/projects", hint: "Enablement, budgets, markup" },
  { id: "requests", label: "Requests", icon: InboxIcon, href: "/admin/requests", hint: "Custom agent pipeline" },
  { id: "support", label: "Support", icon: LifeBuoyIcon, href: "/admin/support", hint: "Tenant tickets" },
  { id: "billing", label: "Billing", icon: WalletIcon, href: "/admin/billing", hint: "Revenue + payment queue" },
  { id: "users", label: "Users", icon: UsersIcon, href: "/admin/users", hint: "Accounts + resets" },
  { id: "logs", label: "Logs", icon: ScrollTextIcon, href: "/admin/logs", hint: "Cross-tenant run log" },
];

/** Every page a tab reaches, as flat items (the tab itself when it has no sub-pages). */
export function tabPages(tab: NavTab): NavItem[] {
  return (
    tab.items ?? [{ label: tab.label, href: tab.href, icon: tab.icon, exact: tab.exact, hint: tab.hint, minRole: tab.minRole }]
  );
}

export function isActive(pathname: string, item: { href: string; exact?: boolean }) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isTabActive(pathname: string, tab: NavTab) {
  return tabPages(tab).some((i) => isActive(pathname, i));
}

/** Parse /o/[orgId](/p/[projectId])?/… into scope. */
export function parseScope(pathname: string): { orgId: string | null; projectId: string | null } {
  const m = /^\/o\/([^/]+)(?:\/p\/([^/]+))?/.exec(pathname);
  return { orgId: m?.[1] ?? null, projectId: m?.[2] ?? null };
}

/**
 * How the shell lays a page out:
 *   "canvas" — fills the viewport and never scrolls (the project canvas)
 *   "bare"   — scrolls, but owns its padding and width (docs)
 *   "page"   — scrolls, centred and padded
 */
export function pageLayout(pathname: string): "canvas" | "bare" | "page" {
  const { orgId, projectId } = parseScope(pathname);
  if (orgId && projectId) {
    const base = `/o/${orgId}/p/${projectId}`;
    if (pathname === base) return "canvas";
    if (pathname === `${base}/docs` || pathname.startsWith(`${base}/docs/`)) return "bare";
  }
  return "page";
}
