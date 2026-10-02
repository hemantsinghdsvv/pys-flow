import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ClipboardCheck, Inbox } from "lucide-react";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { TASK_STATUS_LABELS, PROPOSAL_TYPE_LABELS, PROPOSAL_STATUS_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewDialog } from "@/features/reviews/components/review-dialog";
import { ProposalReviewDialog } from "@/features/propose/components/proposal-review-dialog";

import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Reviews" };

function Rating({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <span className="text-xs text-amber-500">
      {"★".repeat(value)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default async function ReviewsPage() {
  const user = await requireUser();
  if (
    !can(user, "feature:reviews") &&
    !can(user, "review:read") &&
    !can(user, "review:create")
  ) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);
  const canReview = can(user, "review:create");
  const canReviewProposal =
    can(user, "proposal:review") ||
    user.isSystemAdmin === true ||
    user.role === "SENIOR" ||
    user.role === "EXECUTIVE";

  const [pendingProposals, pendingTasks, pendingLogs, givenReviews, receivedReviews] =
    await Promise.all([
      canReviewProposal
        ? prisma.proposal.findMany({
            where: {
              ...scope,
              deletedAt: null,
              status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
              ...(user.role === "EXECUTIVE"
                ? {
                    OR: [
                      { teacherId: user.id },
                      { reviewerId: user.id },
                      { createdById: user.id },
                    ],
                  }
                : {}),
            },
            include: {
              createdBy: { select: { name: true, image: true } },
              teacher: { select: { name: true, image: true } },
              company: { select: { name: true } },
            },
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
      canReview
        ? prisma.task.findMany({
            where: {
              ...scope,
              deletedAt: null,
              status: "REVIEW",
              assigneeId: { not: user.id },
            },
            include: {
              project: { select: { name: true } },
              assignee: { select: { name: true, image: true } },
            },
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
      canReview
        ? prisma.dailyLog.findMany({
            where: { ...scope, deletedAt: null, status: "SUBMITTED" },
            include: {
              student: { select: { name: true, image: true } },
              project: { select: { name: true } },
            },
            orderBy: { date: "desc" },
          })
        : Promise.resolve([]),
      prisma.review.findMany({
        where: { reviewerId: user.id, deletedAt: null },
        include: { reviewee: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.review.findMany({
        where: { revieweeId: user.id, deletedAt: null },
        include: { reviewer: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  const pendingCount = pendingProposals.length + pendingTasks.length + pendingLogs.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Approve, request rework, or reject student work, tasks, and event proposals."
      />

      <Tabs defaultValue={canReview || canReviewProposal ? "pending" : "received"}>
        <TabsList>
          {(canReview || canReviewProposal) && (
            <TabsTrigger value="pending">
              Pending{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </TabsTrigger>
          )}
          {canReview && <TabsTrigger value="given">Given</TabsTrigger>}
          <TabsTrigger value="received">Received</TabsTrigger>
        </TabsList>

        {(canReview || canReviewProposal) && (
          <TabsContent value="pending" className="space-y-6">
            {pendingProposals.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Proposals awaiting review ({pendingProposals.length})
                </h2>
                <div className="grid gap-3">
                  {pendingProposals.map((pr) => (
                    <Card key={pr.id}>
                      <CardContent className="flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <Link
                            href={`/propose/${pr.id}`}
                            className="font-medium hover:underline"
                          >
                            {pr.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{pr.company?.name || "Proposal"}</span>
                            <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                              {PROPOSAL_TYPE_LABELS[pr.type]}
                            </span>
                            <StatusBadge
                              status={pr.status}
                              label={PROPOSAL_STATUS_LABELS[pr.status]}
                            />
                            <span className="font-medium text-foreground">
                              Mentor / Reviewer: {pr.teacher?.name || pr.teacherName || pr.createdBy.name}
                            </span>
                          </div>
                        </div>
                        <ProposalReviewDialog
                          proposalId={pr.id}
                          proposalTitle={pr.title}
                          trigger={
                            <Button size="sm" variant="outline">
                              <ClipboardCheck className="size-4" /> Review
                            </Button>
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Tasks awaiting review
              </h2>
              {pendingTasks.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No tasks to review"
                  description="Tasks moved to Review appear here."
                />
              ) : (
                <div className="grid gap-3">
                  {pendingTasks.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <Link
                            href={`/tasks/${t.id}`}
                            className="font-medium hover:underline"
                          >
                            {t.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{t.project?.name ?? "General Task"}</span>
                            {t.assignee && (
                              <span className="flex items-center gap-1.5">
                                <UserAvatar
                                  name={t.assignee.name}
                                  image={t.assignee.image}
                                  className="size-5"
                                />
                                {t.assignee.name}
                              </span>
                            )}
                            <StatusBadge
                              status={t.status}
                              label={TASK_STATUS_LABELS[t.status]}
                            />
                          </div>
                        </div>
                        <ReviewDialog
                          targetType="TASK"
                          targetId={t.id}
                          title={`Review “${t.title}”`}
                          trigger={
                            <Button size="sm" variant="outline">
                              <ClipboardCheck className="size-4" /> Review
                            </Button>
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Daily reports awaiting review
              </h2>
              {pendingLogs.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No reports to review"
                  description="Submitted daily reports appear here."
                />
              ) : (
                <div className="grid gap-3">
                  {pendingLogs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="flex items-center justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <Link
                            href={`/daily-logs/${log.id}`}
                            className="font-medium hover:underline"
                          >
                            {format(log.date, "d MMM yyyy")} · {log.hoursWorked}h
                          </Link>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <UserAvatar
                                name={log.student.name}
                                image={log.student.image}
                                className="size-5"
                              />
                              {log.student.name}
                            </span>
                            {log.project && <span>{log.project.name}</span>}
                          </div>
                        </div>
                        <ReviewDialog
                          targetType="DAILY_LOG"
                          targetId={log.id}
                          title="Review daily report"
                          trigger={
                            <Button size="sm" variant="outline">
                              <ClipboardCheck className="size-4" /> Review
                            </Button>
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        )}

        {canReview && (
          <TabsContent value="given">
            {givenReviews.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No reviews given yet"
                description="Reviews you submit will be listed here."
              />
            ) : (
              <div className="grid gap-3">
                {givenReviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <UserAvatar
                            name={r.reviewee.name}
                            image={r.reviewee.image}
                            className="size-6"
                          />
                          {r.reviewee.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Rating value={r.rating} />
                          <StatusBadge status={r.verdict} />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.feedback}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(r.createdAt, "d MMM yyyy")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="received">
          {receivedReviews.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No reviews yet"
              description="Feedback on your work and reports will appear here."
            />
          ) : (
            <div className="grid gap-3">
              {receivedReviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <UserAvatar
                          name={r.reviewer.name}
                          image={r.reviewer.image}
                          className="size-6"
                        />
                        {r.reviewer.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Rating value={r.rating} />
                        <StatusBadge status={r.verdict} />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.feedback}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(r.createdAt, "d MMM yyyy")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
