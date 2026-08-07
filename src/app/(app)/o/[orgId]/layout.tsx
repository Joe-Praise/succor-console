import { OrgLayoutClient } from "./layout-client";

export default async function OrgLayout({
  params,
  children,
}: {
  params: Promise<{ orgId: string }>;
  children: React.ReactNode;
}) {
  const { orgId } = await params;
  return <OrgLayoutClient orgId={orgId}>{children}</OrgLayoutClient>;
}
