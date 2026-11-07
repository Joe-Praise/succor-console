import { ConceptsPage, OverviewPage, QuickstartPage } from "@/features/docs/content-start";
import {
  AuthenticationPage,
  CallbacksPage,
  CallingAgentsPage,
  EnvironmentsPage,
  JobsPage,
  ResponsesPage,
} from "@/features/docs/content-integrate";
import {
  ApprovalsPage,
  GroundingPage,
  PlaygroundPage,
  ProfilePage,
  ToolsPage,
  WorkflowsPage,
} from "@/features/docs/content-platform";
import {
  AgentsReferencePage,
  ApiReferencePage,
  ReadingARunPage,
  SecurityPage,
  TroubleshootingPage,
  UsageBillingPage,
} from "@/features/docs/content-operate";

const PAGES: Record<string, () => React.ReactNode> = {
  "": OverviewPage,
  quickstart: QuickstartPage,
  concepts: ConceptsPage,
  authentication: AuthenticationPage,
  "calling-agents": CallingAgentsPage,
  responses: ResponsesPage,
  callbacks: CallbacksPage,
  jobs: JobsPage,
  environments: EnvironmentsPage,
  approvals: ApprovalsPage,
  workflows: WorkflowsPage,
  tools: ToolsPage,
  profile: ProfilePage,
  grounding: GroundingPage,
  playground: PlaygroundPage,
  "reading-a-run": ReadingARunPage,
  "usage-billing": UsageBillingPage,
  security: SecurityPage,
  troubleshooting: TroubleshootingPage,
  agents: AgentsReferencePage,
  api: ApiReferencePage,
};

export function hasContent(slug: string): boolean {
  return slug in PAGES;
}

export function DocContent({ slug }: { slug: string }) {
  const Page = PAGES[slug];
  return Page ? <Page /> : null;
}
