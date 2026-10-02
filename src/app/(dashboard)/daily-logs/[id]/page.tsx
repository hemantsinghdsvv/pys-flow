import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Pencil,
  ClipboardCheck,
  GitBranch,
  Globe,
  Clock,
} from "lucide-react";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DAILY_LOG_STATUS_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteDailyLogButton } from "@/features/daily-logs/components/delete-daily-log-button";
import { ReviewDialog } from "@/features/reviews/components/review-dialog";

export const metadata: Metadata = { title: "Daily Report" };

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
        {value}
      </p>
    </div>
  );
}

export default async function DailyLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const log = await prisma.dailyLog.findFirst({
    where: { id, deletedAt: null },
    include: {
      student: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      reviews: {
        where: { deletedAt: null },
        include: { reviewer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!log) notFound();
  assertCompanyAccess(user, log.companyId);

  const isOwner = log.studentId === user.id;
  const canEdit = isOwner && log.status !== "APPROVED";
  const canReview = can(user, "review:create") && !isOwner;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Report · ${format(log.date, "d MMM yyyy")}`}
        description={
          <span className="flex items-center gap-2">
            <UserAvatar
              name={log.student.name}
              image={log.student.image}
              className="size-5"
            />
            {log.student.name}
          </span>
        }
        actions={
          <>
            <StatusBadge
              status={log.status}
              label={DAILY_LOG_STATUS_LABELS[log.status]}
            />
            {canReview && (
              <ReviewDialog
                targetType="DAILY_LOG"
                targetId={log.id}
                title="Review daily report"
                trigger={
                  <Button variant="outline">
                    <ClipboardCheck className="size-4" /> Review
                  </Button>
                }
              />
            )}
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/daily-logs/${log.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
            )}
            {isOwner && <DeleteDailyLogButton logId={log.id} />}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Field label="What was worked on" value={log.description} />
              <Field label="Achievements" value={log.achievements} />
              <Field label="Blockers" value={log.blockers} />
              <Field label="Plan for tomorrow" value={log.tomorrowPlan} />
              <Field label="Notes" value={log.notes} />
            </CardContent>
          </Card>

          {log.reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="size-4" /> Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {log.reviews.map((r) => (
                  <div key={r.id} className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={r.verdict} />
                      <span className="text-xs text-muted-foreground">
                        {r.reviewer.name} · {format(r.createdAt, "d MMM")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{r.feedback}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" /> Hours
                </span>
                <span>{log.hoursWorked}h</span>
              </div>
              {log.project && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <Link
                    href={`/projects/${log.project.id}`}
                    className="hover:underline"
                  >
                    {log.project.name}
                  </Link>
                </div>
              )}
              {log.task && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Task</span>
                  <Link
                    href={`/tasks/${log.task.id}`}
                    className="truncate hover:underline"
                  >
                    {log.task.title}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {(log.repositoryLink || log.deploymentLink || log.driveLink) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {log.repositoryLink && (
                  <a
                    href={log.repositoryLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <GitBranch className="size-4" /> Repository
                  </a>
                )}
                {log.deploymentLink && (
                  <a
                    href={log.deploymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="size-4" /> Deployment
                  </a>
                )}
                {log.driveLink && (
                  <a
                    href={log.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ClipboardCheck className="size-4" /> Drive / Document
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
