import { redirect } from "next/navigation";

/** /jobs moved to /runs (the execution explorer). Kept so old links still land. */
export default async function JobsRedirect({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const { orgId, projectId } = await params;
  redirect(`/o/${orgId}/p/${projectId}/runs`);
}
