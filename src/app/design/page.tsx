"use client";

import { useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  Loader2Icon,
  KeyRoundIcon,
  CommandIcon,
  ArrowRightIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion, animateCounter } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { BudgetMeter } from "@/components/ui/budget-meter";
import { EmptyState } from "@/components/ui/empty-state";
import { SecretReveal } from "@/components/secret-reveal";
import { CommandPalette, OPEN_COMMAND_PALETTE } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";

/* ---- layout helpers ------------------------------------------------------ */

function Section({
  title,
  spec,
  children,
}: {
  title: string;
  spec?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-hairline pt-8">
      <div className="space-y-0.5">
        <h2
          className="font-heading font-semibold tracking-tight text-foreground"
          style={{ fontSize: 20, lineHeight: "26px" }}
        >
          {title}
        </h2>
        {spec ? <p className="text-xs text-faint">{spec}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  name,
  className,
  ring,
}: {
  name: string;
  className: string;
  ring?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "h-14 rounded-lg",
          ring ? "ring-1 ring-inset ring-border" : "",
          className,
        )}
      />
      <p className="font-mono text-[11px] text-muted-foreground">{name}</p>
    </div>
  );
}

/* ---- demo data ----------------------------------------------------------- */

const CHART_DATA = [
  { d: "Mon", v: 1240 },
  { d: "Tue", v: 1810 },
  { d: "Wed", v: 1520 },
  { d: "Thu", v: 2260 },
  { d: "Fri", v: 1980 },
  { d: "Sat", v: 900 },
  { d: "Sun", v: 1120 },
];

const RUNS: { id: string; agent: string; status: Status; tokens: number; billed: number }[] = [
  { id: "run_8f2a91", agent: "seo-page-factory", status: "delivered", tokens: 4820, billed: 0.142 },
  { id: "run_7c1b40", agent: "alt-text-optimizer", status: "building", tokens: 1210, billed: 0.038 },
  { id: "run_5a9e12", agent: "campaign-writer", status: "rejected", tokens: 0, billed: 0 },
  { id: "run_2d7f88", agent: "topic-cluster-builder", status: "delivered", tokens: 6390, billed: 0.191 },
];

const ALL_STATUSES: Status[] = [
  "draft", "issued", "paid", "void", "pending", "approved",
  "suspended", "in_review", "building", "delivered", "rejected", "active", "revoked",
];

const TYPE_SCALE: {
  name: string; px: number; lh: number; w: number; tr: string; sample: string; serif?: boolean;
}[] = [
  { name: "display · serif", px: 44, lh: 48, w: 500, tr: "-0.01em", sample: "Metered agents", serif: true },
  { name: "h1", px: 28, lh: 34, w: 600, tr: "-0.015em", sample: "Usage this month" },
  { name: "h2", px: 20, lh: 26, w: 600, tr: "-0.01em", sample: "Recent runs" },
  { name: "h3", px: 16, lh: 22, w: 600, tr: "-0.005em", sample: "Callback delivery" },
  { name: "body", px: 15, lh: 24, w: 400, tr: "0", sample: "The comfortable workhorse text size across app surfaces." },
  { name: "body-strong", px: 15, lh: 24, w: 500, tr: "0", sample: "Emphasised inline value." },
  { name: "label", px: 13, lh: 18, w: 500, tr: "0", sample: "Field label" },
  { name: "caption", px: 12, lh: 16, w: 500, tr: "0.01em", sample: "Secondary caption text" },
];

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 3 });
}

/* ---- page ---------------------------------------------------------------- */

export default function DesignSystemPage() {
  const [secretOpen, setSecretOpen] = useState(false);
  const counterRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  function replayMotion() {
    if (counterRef.current) {
      animateCounter(counterRef.current, 12847, {
        format: (n) => Math.round(n).toLocaleString(),
      });
    }
    if (boxRef.current && !prefersReducedMotion()) {
      gsap.fromTo(
        boxRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" },
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <CommandPalette />

      {/* header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div className="space-y-1">
          <p className="font-mono text-xs tracking-wide text-brand">agent-portal · C0</p>
          <h1
            className="font-serif text-foreground"
            style={{ fontSize: 44, lineHeight: "48px", fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            Design system
          </h1>
          <p className="text-muted-foreground">
            Every token and primitive, themed. Toggle light/dark to verify both.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
          >
            <CommandIcon />
            Command palette
            <kbd className="ml-1 rounded bg-raised px-1.5 font-mono text-[11px] text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="space-y-10">
        {/* colors */}
        <Section title="Surfaces" spec="Warm paper canvas — soft shadows + hairline borders carry depth">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name="background" className="bg-background" ring />
            <Swatch name="surface" className="bg-surface" ring />
            <Swatch name="raised" className="bg-raised" ring />
            <Swatch name="overlay" className="bg-overlay shadow-md" ring />
          </div>
        </Section>

        <Section title="Borders & text">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <div className="flex h-14 items-center justify-center gap-2 rounded-lg bg-surface">
                <div className="size-8 rounded border-2 border-hairline" />
                <div className="size-8 rounded border-2 border-border" />
                <div className="size-8 rounded border-2 border-strong" />
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">hairline · border · strong</p>
            </div>
            <div className="col-span-2 space-y-1 rounded-lg bg-surface p-4">
              <p className="text-foreground">text-foreground — primary</p>
              <p className="text-muted-foreground">text-muted-foreground — secondary</p>
              <p className="text-faint">text-faint — tertiary</p>
            </div>
          </div>
        </Section>

        <Section title="Accent, semantic & charts" spec="Clay accent — links, active nav, focus, brand moments; primary actions stay neutral">

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground">brand</span>
            <span className="rounded-md bg-success-bg px-3 py-1.5 text-sm font-medium text-success">success</span>
            <span className="rounded-md bg-warning-bg px-3 py-1.5 text-sm font-medium text-warning">warning</span>
            <span className="rounded-md bg-error-bg px-3 py-1.5 text-sm font-medium text-error">error</span>
            <span className="rounded-md bg-info-bg px-3 py-1.5 text-sm font-medium text-info">info</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="flex items-center gap-1.5">
                <div className="size-5 rounded" style={{ backgroundColor: `var(--chart-${n})` }} />
                <span className="font-mono text-[11px] text-muted-foreground">chart-{n}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* typography */}
        <Section title="Typography" spec="Geist Sans (UI) · Newsreader serif (display) · Geist Mono (code) — roomy 15px body">

          <div className="space-y-3 rounded-xl bg-surface p-5">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="flex items-baseline gap-4">
                <span className="w-24 shrink-0 font-mono text-[11px] text-faint">
                  {t.name} · {t.px}
                </span>
                <span
                  className={cn("text-foreground", t.serif && "font-serif")}
                  style={{ fontSize: t.px, lineHeight: `${t.lh}px`, fontWeight: t.w, letterSpacing: t.tr }}
                >
                  {t.sample}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex items-baseline gap-4">
              <span className="w-24 shrink-0 font-mono text-[11px] text-faint">mono · tabular</span>
              <span className="font-mono tabular-nums text-foreground">$1,204.518 · 48,291 tok · ask_live_9f…a3c1</span>
            </div>
          </div>
        </Section>

        {/* radius */}
        <Section title="Radius" spec="Soft & generous — 10 inputs/buttons · 14 cards/tables · 20 modals · full pills">
          <div className="flex flex-wrap items-end gap-4">
            {[
              { label: "10 · buttons", cls: "rounded-lg" },
              { label: "14 · cards", cls: "rounded-xl" },
              { label: "20 · modals", cls: "rounded-2xl" },
              { label: "full · pills", cls: "rounded-full" },
            ].map((r) => (
              <div key={r.label} className="space-y-1.5 text-center">
                <div className={cn("size-16 border border-strong bg-surface shadow-sm", r.cls)} />
                <p className="font-mono text-[11px] text-muted-foreground">{r.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* buttons */}
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Key"><KeyRoundIcon /></Button>
            <Button disabled>
              <Loader2Icon className="animate-spin" />
              Working…
            </Button>
            <Button>
              Continue
              <ArrowRightIcon />
            </Button>
          </div>
        </Section>

        {/* badges */}
        <Section title="Badges & status" spec="Sentence case, dot + 12% tint bg + colored text — never color-only">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {ALL_STATUSES.map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </Section>

        {/* forms */}
        <Section title="Form controls">
          <div className="grid max-w-xl gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="proj">Project name</Label>
              <Input id="proj" placeholder="acme-marketing" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" placeholder="What does this project do?" />
            </div>
            <div className="flex items-center gap-6">
              <div className="space-y-1.5">
                <Label>Granularity</Label>
                <Select defaultValue="day">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch id="live" defaultChecked />
                <Label htmlFor="live">Live mode</Label>
              </div>
            </div>
          </div>
        </Section>

        {/* table */}
        <Section title="Data table" spec="Hairline rows, no zebra, mono right-aligned tabular numerics">
          <div className="overflow-hidden rounded-xl border border-hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RUNS.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-muted-foreground">{r.id}</TableCell>
                    <TableCell className="font-mono">{r.agent}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{r.tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{usd(r.billed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        {/* cards + budget meter */}
        <Section title="Cards & budget meter" spec="ok < 80% · warn ≥ 80% (amber) · exceeded (error + stripe + 402 banner)">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Spend</CardTitle>
                <CardDescription>Current month, cost-plus.</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetMeter spent={41.2} budget={100} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Approaching cap</CardTitle>
                <CardDescription>Warning at 80%.</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetMeter spent={86.5} budget={100} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Exceeded</CardTitle>
                <CardDescription>Agents return 402.</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetMeter spent={118.4} budget={100} />
              </CardContent>
              <CardFooter>
                <span className="text-xs text-muted-foreground">Raise the cap to resume.</span>
              </CardFooter>
            </Card>
          </div>
        </Section>

        {/* chart */}
        <Section title="Chart" spec="Warm categorical palette; soft 15%-alpha area fill, no saturated gradients">
          <div className="rounded-xl border border-hairline bg-surface p-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" stroke="var(--chart-axis)" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--chart-axis)" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <RTooltip
                    cursor={{ stroke: "var(--chart-grid)" }}
                    contentStyle={{
                      background: "var(--overlay)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--muted-foreground)" }}
                  />
                  <Area type="monotone" dataKey="v" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        {/* tabs / tooltip / progress / skeleton */}
        <Section title="Tabs · tooltip · skeletons">
          <Tabs defaultValue="overview" className="max-w-md">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="danger">Danger</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-3 text-sm text-muted-foreground">
              Overview panel content.
            </TabsContent>
            <TabsContent value="config" className="pt-3 text-sm text-muted-foreground">
              Configuration panel content.
            </TabsContent>
            <TabsContent value="danger" className="pt-3 text-sm text-muted-foreground">
              Danger-zone panel content.
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-4 pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" size="sm">Hover for tooltip</Button>} />
                <TooltipContent>Runs are metered per token.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Section>

        {/* overlays: dialog, secret reveal, empty state */}
        <Section title="Overlays & states" spec="One-time secret reveal (masked dots, explicit confirm); single-CTA empty state">
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete project?</DialogTitle>
                  <DialogDescription>
                    This permanently removes the project and revokes its keys. This can&apos;t be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button variant="destructive">Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={() => setSecretOpen(true)}>
              <KeyRoundIcon />
              Reveal a key (one-time)
            </Button>
          </div>

          <SecretReveal
            open={secretOpen}
            onOpenChange={setSecretOpen}
            label="API key"
            prefix="ask_live_"
            secret="ask_live_9f2Ka7Xb1QpZ0r4Ln8Vd6Ec3Ty5Uw2Hs"
          />

          <div className="max-w-md pt-2">
            <EmptyState
              icon={KeyRoundIcon}
              title="No API keys yet"
              description="Create a key to start making requests."
              action={<Button size="sm"><KeyRoundIcon />Create key</Button>}
            />
          </div>
        </Section>

        {/* toasts */}
        <Section title="Toasts" spec="sonner, bottom-right, semantic-tinted; errors persist, successes auto-dismiss">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("API key created")}>Success</Button>
            <Button variant="outline" size="sm" onClick={() => toast.error("Budget exceeded — 402")}>Error</Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Callback delivered")}>Info</Button>
            <Button variant="outline" size="sm" onClick={() => toast.warning("Approaching budget cap")}>Warning</Button>
            <Button variant="outline" size="sm" onClick={() => toast.loading("Running agent…")}>Loading</Button>
          </div>
        </Section>

        {/* motion */}
        <Section title="Motion" spec="GSAP only; counters first-load only; honours prefers-reduced-motion">
          <div className="flex items-center gap-6 rounded-xl bg-surface p-5">
            <div ref={boxRef}>
              <span className="font-mono text-xs text-faint">tokens this month</span>
              <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                <span ref={counterRef}>0</span>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={replayMotion}>Replay</Button>
          </div>
        </Section>
      </div>

      <footer className="mt-12 border-t border-hairline pt-6 text-xs text-faint">
        C0 · design system complete — next: C1 scaffold + auth (BFF, login, app shell).
      </footer>
    </div>
  );
}
