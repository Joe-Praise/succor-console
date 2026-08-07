import { z } from "zod";

/** Mirrors agent-service `UserRole` (PLATFORM role — "owner" = platform admin). */
export const RoleSchema = z.enum(["owner", "tenant"]);
export type Role = z.infer<typeof RoleSchema>;

/** Org RBAC role (OrgMembership). */
export const OrgRoleSchema = z.enum(["owner", "admin", "developer"]);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

export const OrgStatusSchema = z.enum(["pending", "approved", "suspended"]);
export type OrgStatus = z.infer<typeof OrgStatusSchema>;

/** Mirrors agent-service `publicUser()` (routes/auth.ts). Contract is FIXED. */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: RoleSchema,
  active: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

/** A project reference as returned inside GET /auth/me orgs[]. */
export const ProjectRefSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  status: z.string(),
});
export type ProjectRef = z.infer<typeof ProjectRefSchema>;

/** An org (with the caller's role) as returned by GET /auth/me. */
export const OrgRefSchema = z.object({
  orgId: z.string(),
  name: z.string(),
  status: OrgStatusSchema,
  role: OrgRoleSchema,
  projects: z.array(ProjectRefSchema),
});
export type OrgRef = z.infer<typeof OrgRefSchema>;

/** GET /auth/me response (v2 — org-shaped). */
export const MeSchema = z.object({
  user: UserSchema,
  isPlatformAdmin: z.boolean(),
  orgs: z.array(OrgRefSchema),
});
export type Me = z.infer<typeof MeSchema>;

// ---------------------------------------------------------------------------
// Orgs
// ---------------------------------------------------------------------------

export const OrgSummarySchema = z.object({
  orgId: z.string(),
  name: z.string(),
  status: OrgStatusSchema,
  billingEmail: z.string(),
  role: OrgRoleSchema.optional(),
  createdAt: z.coerce.date().optional(),
});
export type OrgSummary = z.infer<typeof OrgSummarySchema>;

export const OrgDetailSchema = z.object({
  org: z.object({
    orgId: z.string(),
    name: z.string(),
    status: OrgStatusSchema,
    billingEmail: z.string(),
    createdAt: z.coerce.date().optional(),
  }),
  role: z.union([OrgRoleSchema, z.literal("platform")]).nullable(),
  memberCount: z.number(),
  projects: z.array(
    z.object({
      projectId: z.string(),
      name: z.string(),
      status: z.string(),
      createdAt: z.coerce.date().optional(),
    }),
  ),
});
export type OrgDetail = z.infer<typeof OrgDetailSchema>;

export const MemberSchema = z.object({
  userId: z.string(),
  role: OrgRoleSchema,
  email: z.string().nullable(),
  name: z.string().nullable(),
  active: z.boolean(),
  invitedBy: z.string().nullable(),
});
export type Member = z.infer<typeof MemberSchema>;

export const InviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: OrgRoleSchema.optional(),
  status: z.string(),
  invitedBy: z.string().optional(),
  expiresAt: z.coerce.date(),
  acceptedBy: z.string().nullable().optional(),
  acceptedAt: z.coerce.date().nullable().optional(),
});
export type Invite = z.infer<typeof InviteSchema>;

// ---------------------------------------------------------------------------
// Projects & keys
// ---------------------------------------------------------------------------

export const ApiUrlSchema = z.object({ label: z.string(), url: z.string() });

/** Project document as the portal sees it (agentApiKey never leaves the API). */
export const ProjectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  apiBaseUrls: z.array(ApiUrlSchema).optional(),
  status: z.string().optional().default("approved"),
  orgId: z.string().nullable().optional(),
  enabledAgents: z.array(z.string()).nullable().optional(),
  monthlyBudgetUsd: z.number().nullable().optional(),
  markupMultiplier: z.number().nullable().optional(),
  createdAt: z.coerce.date().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ApiKeySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  last4: z.string(),
  createdBy: z.string(),
  lastUsedAt: z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
});
export type ApiKeySummary = z.infer<typeof ApiKeySummarySchema>;

export const MintedKeySchema = z.object({
  id: z.string(),
  fullKey: z.string(),
  prefix: z.string(),
  last4: z.string(),
  name: z.string(),
});
export type MintedKey = z.infer<typeof MintedKeySchema>;

export const ProjectSetupSchema = z.object({
  serviceUrl: z.string(),
  projectId: z.string(),
  orgId: z.string().nullable(),
  status: z.string(),
  env: z.record(z.string(), z.string()),
  enabledAgents: z.array(z.record(z.string(), z.unknown())),
});
export type ProjectSetup = z.infer<typeof ProjectSetupSchema>;

// ---------------------------------------------------------------------------
// Usage & billing
// ---------------------------------------------------------------------------

export const CurrentUsageSchema = z.object({
  projectId: z.string(),
  month: z.string(),
  runs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  embeddingTokens: z.number(),
  costUsd: z.number(),
  billedUsd: z.number(),
  monthlyBudgetUsd: z.number().nullable(),
  remainingBudgetUsd: z.number().nullable(),
  budgetExceeded: z.boolean(),
});
export type CurrentUsage = z.infer<typeof CurrentUsageSchema>;

export const UsageBucketSchema = z.object({
  period: z.string(),
  runs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  embeddingTokens: z.number(),
  costUsd: z.number(),
  billedUsd: z.number(),
  statuses: z.record(z.string(), z.number()),
  agentType: z.string().optional(),
  model: z.string().optional(),
});
export type UsageBucket = z.infer<typeof UsageBucketSchema>;

export const UsageResponseSchema = z.object({
  projectId: z.string(),
  granularity: z.string(),
  groupBy: z.string(),
  buckets: z.array(UsageBucketSchema),
  totals: z.object({
    runs: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    embeddingTokens: z.number(),
    costUsd: z.number(),
    billedUsd: z.number(),
    statuses: z.record(z.string(), z.number()),
  }),
});
export type UsageResponse = z.infer<typeof UsageResponseSchema>;

export const InvoiceStatusSchema = z.enum(["draft", "issued", "payment_submitted", "paid", "void"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceLineItemSchema = z.object({
  agentType: z.string(),
  runs: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  embeddingTokens: z.number(),
  costUsd: z.number(),
  billedUsd: z.number(),
});

export const InvoiceSchema = z.object({
  invoiceNumber: z.string(),
  projectId: z.string(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  lineItems: z.array(InvoiceLineItemSchema),
  totalCostUsd: z.number(),
  totalBilledUsd: z.number(),
  status: InvoiceStatusSchema,
  issuedAt: z.coerce.date().nullable(),
  paidAt: z.coerce.date().nullable(),
  paymentReference: z.string().nullable(),
  paymentMethod: z.string().nullable().optional(),
  paymentNote: z.string().nullable().optional(),
  paymentSubmittedAt: z.coerce.date().nullable().optional(),
  paymentSubmittedBy: z.string().nullable().optional(),
  paymentConfirmedBy: z.string().nullable().optional(),
  generatedAt: z.coerce.date().optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const OrgBillingSummarySchema = z.object({
  orgId: z.string(),
  month: z.string(),
  totalBilledUsd: z.number(),
  byProject: z.array(
    z.object({
      projectId: z.string(),
      name: z.string(),
      status: z.string(),
      monthlyBudgetUsd: z.number().nullable(),
      runs: z.number(),
      costUsd: z.number(),
      billedUsd: z.number(),
    }),
  ),
  invoiceCounts: z.record(
    z.string(),
    z.object({ count: z.number(), totalBilledUsd: z.number() }),
  ),
});
export type OrgBillingSummary = z.infer<typeof OrgBillingSummarySchema>;

// ---------------------------------------------------------------------------
// Catalog & agent requests
// ---------------------------------------------------------------------------

export const CatalogEntrySchema = z.object({
  agentType: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  endpoint: z.string(),
  requestExample: z.record(z.string(), z.unknown()),
  callbackPath: z.string(),
  callbackMethod: z.string(),
  callbackExample: z.record(z.string(), z.unknown()),
  typicalMaxTokens: z.number(),
  enabledForProject: z.boolean().optional(),
});
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;

export const AgentRequestSchema = z.object({
  _id: z.string(),
  projectId: z.string(),
  requestedBy: z.string(),
  title: z.string(),
  description: z.string(),
  desiredInputs: z.string().optional().default(""),
  desiredCallback: z.string().optional().default(""),
  status: z.string().optional().default("pending"),
  adminNotes: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
});
export type AgentRequest = z.infer<typeof AgentRequestSchema>;
