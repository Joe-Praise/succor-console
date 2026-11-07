import { redirect } from "next/navigation";

/** /jobs/:id moved to /runs/:id. Kept so links from earlier docs and toasts still land. */
export default async function JobRedirect({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string; jobId: string }>;
}) {
  const { orgId, projectId, jobId } = await params;
  redirect(`/o/${orgId}/p/${projectId}/runs/${encodeURIComponent(jobId)}`);
}
