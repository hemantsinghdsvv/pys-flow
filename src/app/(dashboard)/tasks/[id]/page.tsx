import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Pencil,
  Clock,
  CalendarClock,
  Link2,
  MessageSquare,
  ListTree,
  ClipboardCheck,
} from "lucide-react";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CommentsSection,
  type CommentItem,
} from "@/features/tasks/components/comments-section";
import { DeleteTaskButton } from "@/features/tasks/components/delete-task-button";
import { TaskStateButtons } from "@/features/tasks/components/task-state-buttons";
import { TaskApprovalButtons } from "@/features/tasks/components/task-approval-buttons";
import { AutoViewTracker } from "@/features/tasks/components/auto-view-tracker";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Task" };

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true } },
      assignee: { select: { id: true, name: true, image: true } },
      createdBy: { select: { id: true, name: true } },
      subtasks: {
        where: { deletedAt: null },
        select: { id: true, title: true, status: true },
        orderBy: { order: "asc" },
      },
      dependencies: {
        select: {
          dependsOn: { select: { id: true, title: true, status: true } },
        },
      },
      comments: {
        where: { deletedAt: null },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      approval: true,
    },
  });
  if (!task) notFound();

  const reviews = await prisma.review.findMany({
    where: { targetType: "TASK", targetId: task.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { reviewer: { select: { name: true } } },
  });

  const isStudent = user.role === "INTERN";
  const isAssignee = task.assigneeId === user.id;

  // Full task managers (MANAGER + roles with task:assign like SENIOR, EXECUTIVE,
  // EXECUTIVE, SENIOR, MANAGER) can edit any task in their company scope.
  // Others (students, basic roles) can only edit tasks they created or are assigned to.
  const isFullManager =
    user.isSystemAdmin === true ||
    can(user, "task:assign");

  const canEdit =
    can(user, "task:update") &&
    (isFullManager || task.createdById === user.id || isAssignee);

  const canDelete =
    can(user, "task:delete") &&
    (isFullManager || task.createdById === user.id);

  const canReview =
    can(user, "review:create") &&
    !!task.assigneeId &&
    task.status === "REVIEW";

  // Fetch today's acknowledgement for this task (students only)
  let todayAck: { status: "ON_TIME" | "LATE" } | null = null;
  if (isStudent && isAssignee) {
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const ack = await prisma.taskAcknowledgement.findUnique({
      where: { taskId_studentId_date: { taskId: task.id, studentId: user.id, date: todayUtc } },
      select: { status: true },
    });
    todayAck = ack ?? null;
  }

  const comments: CommentItem[] = task.comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorId: c.authorId,
    authorName: c.author.name,
    authorImage: c.author.image,
  }));

  return (
    <div className="space-y-6">
      <AutoViewTracker taskId={task.id} status={task.status} isAssignee={isAssignee} />
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {task.title}
            {task.approval?.status === "PENDING" && (
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                Pending Approval
              </Badge>
            )}
            {task.approval?.status === "DECLINED" && (
              <Badge variant="destructive">Declined</Badge>
            )}
          </span>
        }
        description={
          <>
            in{" "}
            <Link
              href={task.projectId ? `/projects/${task.projectId}` : "#"}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {task.project?.name ?? "General Task"}
            </Link>
          </>
        }
        actions={
          <>
            {user.isSystemAdmin === true && task.approval?.status === "PENDING" && (
              <TaskApprovalButtons taskId={task.id} />
            )}
            <TaskStateButtons 
              taskId={task.id} 
              status={task.status} 
              isAssignee={isAssignee} 
              canEdit={canEdit} 
            />
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/tasks/${task.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <div 
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description provided.
                </p>
              )}
            </CardContent>
          </Card>

          {task.subtasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListTree className="size-4" /> Subtasks (
                  {task.subtasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.subtasks.map((s) => (
                  <Link
                    key={s.id}
                    href={`/tasks/${s.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span>{s.title}</span>
                    <StatusBadge
                      status={s.status}
                      label={TASK_STATUS_LABELS[s.status]}
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" /> Comments (
                {comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CommentsSection
                taskId={task.id}
                comments={comments}
                currentUserId={user.id}
                canDeleteAny={!isStudent}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge
                  status={task.status}
                  label={TASK_STATUS_LABELS[task.status]}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Priority</span>
                <StatusBadge
                  status={task.priority}
                  label={PRIORITY_LABELS[task.priority]}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assignee</span>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={task.assignee.name}
                      image={task.assignee.image}
                      className="size-6"
                    />
                    <span>{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
              {task.milestone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Milestone</span>
                  <span>{task.milestone.title}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarClock className="size-3.5" /> Deadline
                </span>
                <span>
                  {task.deadline
                    ? format(task.deadline, "d MMM yyyy")
                    : "—"}
                </span>
              </div>

            </CardContent>
          </Card>

          {task.dependencies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="size-4" /> Blocked by
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.dependencies.map(({ dependsOn }) => (
                  <Link
                    key={dependsOn.id}
                    href={`/tasks/${dependsOn.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="truncate">{dependsOn.title}</span>
                    <StatusBadge
                      status={dependsOn.status}
                      label={TASK_STATUS_LABELS[dependsOn.status]}
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="size-4" /> Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviews.map((r) => (
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
      </div>
    </div>
  );
}
