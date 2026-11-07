"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoyIcon, Loader2Icon, SendIcon } from "lucide-react";

import { useProjectScope } from "@/features/projects/use-project-scope";
import { useCreateTicket, useTickets } from "@/features/governance/hooks";
import { ApiError } from "@/api/client";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ops/data-table";
import { relativeTime } from "@/lib/format";

export default function SupportPage() {
  const { orgId, projectId } = useProjectScope();
  const tickets = useTickets(projectId);
  const create = useCreateTicket(projectId);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const rows = tickets.data?.tickets ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support"
        description="Reach the team that runs your agents. Include a job ID and we can trace the exact run."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Open a ticket</CardTitle>
            <CardDescription>Tied to this project, visible to everyone on it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(
                  { subject: subject.trim(), message: message.trim() },
                  {
                    onSuccess: () => {
                      setSubject("");
                      setMessage("");
                      toast.success("Ticket opened — we'll be in touch.");
                    },
                    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't open the ticket"),
                  },
                );
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="t-subject">Subject</Label>
                <Input
                  id="t-subject"
                  maxLength={200}
                  placeholder="Callbacks to staging returning 401"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-message">What&apos;s happening?</Label>
                <Textarea
                  id="t-message"
                  rows={7}
                  maxLength={8000}
                  placeholder={"What you expected, what happened instead, and any job IDs.\n\njob 66f…a91 — dead-lettered after 3 attempts"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending || !subject.trim() || !message.trim()}>
                {create.isPending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
                Send to support
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-faint">Your tickets</h2>
          {tickets.isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : tickets.isError ? (
            <QueryError message="Couldn't load tickets." onRetry={() => void tickets.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={LifeBuoyIcon}
              title="No tickets"
              description="Anything you open from this project shows up here with its status."
            />
          ) : (
            <DataTable
              rows={rows}
              getRowKey={(t) => t._id}
              getRowHref={(t) => `/o/${orgId}/p/${projectId}/support/${t._id}`}
              getRowLabel={(t) => `Open ticket ${t.subject}`}
              columns={[
                {
                  id: "subject",
                  header: "Subject",
                  className: "max-w-72",
                  cell: (t) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{t.subject}</p>
                      {t.adminNotes ? <p className="text-[11px] text-brand">Support replied</p> : null}
                    </div>
                  ),
                },
                { id: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
                { id: "opened", header: "Opened", cell: (t) => <span className="text-muted-foreground">{relativeTime(t.createdAt)}</span> },
              ]}
            />
          )}
        </section>
      </div>
    </div>
  );
}
