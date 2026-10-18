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
  type LucideIcon,
} from "lucide-react";

import type { OrgRole } from "@/lib/permissions";

/**
 * The console's information architecture, defined ONCE. The sidebar and the ⌘K
 * palette both read from here, so a new surface can't land in one and be missed
 * by the other.
 *
 * Project navigation is grouped by intent rather than listed flat:
 *   Build   — shape what the agents do (catalog, profile, workflows, try it, docs)
 *   Operate — watch and steer live work (jobs, approvals, run log, callbacks)
 *   Govern  — what agents may touch and who did what (tools, audit, keys)
 *   Account — money, help, and configuration
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

export type NavGroup = {
  id: string;
  /** Group heading; omitted for the ungrouped lead item(s). */
  label?: string;
  items: NavItem[];
};

export function orgNav(orgId: string): NavItem[] {
  const base = `/o/${orgId}`;
  return [
    { label: "Overview", href: base, icon: LayoutDashboardIcon, exact: true, hint: "Org home" },
    { label: "Projects", href: `${base}/projects`, icon: FolderKanbanIcon, hint: "Every project in this org" },
    { label: "Team", href: `${base}/team`, icon: UsersIcon, hint: "Members, roles, invites" },
    { label: "Billing", href: `${base}/billing`, icon: WalletIcon, minRole: "admin", hint: "Spend + invoices across projects" },
    { label: "Settings", href: `${base}/settings`, icon: SettingsIcon, hint: "Org name, billing email" },
  ];
}

export function projectNavGroups(orgId: string, projectId: string): NavGroup[] {
  const p = `/o/${orgId}/p/${projectId}`;
  return [
    {
      id: "lead",
      items: [{ label: "Overview", href: p, icon: GaugeIcon, exact: true, hint: "Health, spend, setup" }],
    },
    {
      id: "build",
      label: "Build",
      items: [
        { label: "Agents", href: `${p}/agents`, icon: BoxesIcon, hint: "Catalog + capabilities" },
        { label: "Profile", href: `${p}/profile`, icon: IdCardIcon, hint: "Business profile every prompt reads" },
        { label: "Workflows", href: `${p}/workflows`, icon: WorkflowIcon, hint: "Durable multi-agent pipelines" },
        { label: "Playground", href: `${p}/playground`, icon: FlaskConicalIcon, hint: "Run an agent from the browser" },
        { label: "Docs", href: `${p}/docs`, icon: BookOpenIcon, hint: "Integration guide" },
      ],
    },
    {
      id: "operate",
      label: "Operate",
      items: [
        { label: "Jobs", href: `${p}/jobs`, icon: ActivityIcon, hint: "Durable job status + results" },
        { label: "Approvals", href: `${p}/approvals`, icon: StampIcon, hint: "Held deliveries awaiting review" },
        { label: "Logs", href: `${p}/logs`, icon: ScrollTextIcon, hint: "Metered run log" },
        { label: "Callbacks", href: `${p}/callbacks`, icon: WebhookIcon, hint: "Deliveries to your API" },
      ],
    },
    {
      id: "govern",
      label: "Govern",
      items: [
        { label: "Tools", href: `${p}/tools`, icon: PlugZapIcon, hint: "MCP servers + tool grants" },
        { label: "Audit", href: `${p}/audit`, icon: FingerprintIcon, hint: "Signed governance ledger" },
        { label: "API keys", href: `${p}/keys`, icon: KeyRoundIcon, hint: "Inbound credentials" },
      ],
    },
    {
      id: "account",
      label: "Account",
      items: [
        { label: "Usage", href: `${p}/usage`, icon: BarChart3Icon, hint: "Runs, tokens, cost" },
        { label: "Invoices", href: `${p}/invoices`, icon: ReceiptIcon, minRole: "admin", hint: "Monthly invoices" },
        { label: "Support", href: `${p}/support`, icon: LifeBuoyIcon, hint: "Open a ticket" },
        { label: "Settings", href: `${p}/settings`, icon: SettingsIcon, hint: "Name + callback base URLs" },
      ],
    },
  ];
}

export const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: GaugeIcon, exact: true, hint: "Platform health" },
  { label: "Organizations", href: "/admin/orgs", icon: Building2Icon, hint: "Approve + suspend orgs" },
  { label: "Projects", href: "/admin/projects", icon: FolderKanbanIcon, hint: "Enablement, budgets, markup" },
  { label: "Requests", href: "/admin/requests", icon: InboxIcon, hint: "Custom agent pipeline" },
  { label: "Support", href: "/admin/support", icon: LifeBuoyIcon, hint: "Tenant tickets" },
  { label: "Billing", href: "/admin/billing", icon: WalletIcon, hint: "Revenue + payment queue" },
  { label: "Users", href: "/admin/users", icon: UsersIcon, hint: "Accounts + resets" },
  { label: "Logs", href: "/admin/logs", icon: ScrollTextIcon, hint: "Cross-tenant run log" },
];

export function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Parse /o/[orgId](/p/[projectId])?/… into scope. */
export function parseScope(pathname: string): { orgId: string | null; projectId: string | null } {
  const m = /^\/o\/([^/]+)(?:\/p\/([^/]+))?/.exec(pathname);
  return { orgId: m?.[1] ?? null, projectId: m?.[2] ?? null };
}
