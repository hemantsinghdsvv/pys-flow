"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertCompanyAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { broadcastTaskEvent } from "@/lib/realtime";
import { reviewSchema, type ReviewValues } from "@/features/reviews/schemas";

const VERDICT_TO_TASK_STATUS: Record<string, TaskStatus> = {
  APPROVED: "COMPLETED",
  REWORK: "PENDING",
  REJECTED: "PENDING",
};

/** Mentor reviews a task that is in REVIEW. */
export async function reviewTask(taskId: string, values: ReviewValues) {
  const user = await requirePermission("review:create");
  const data = reviewSchema.parse(values);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { name: true } } },
  });
  if (!task) throw new Error("Task not found");
  assertCompanyAccess(user, task.companyId);
  if (!task.assigneeId) throw new Error("Task has no assignee to review.");

  const review = await prisma.review.create({
    data: {
      companyId: task.companyId,
      targetType: "TASK",
      targetId: taskId,
      revieweeId: task.assigneeId,
      reviewerId: user.id,
      verdict: data.verdict,
      rating: data.rating ?? null,
      feedback: data.feedback,
    },
  });

  const nextStatus = VERDICT_TO_TASK_STATUS[data.verdict];
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      ...(nextStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
    },
  });

  await notify({
    userId: task.assigneeId,
    type: "REVIEW_COMPLETED",
    title: `Task ${data.verdict === "APPROVED" ? "approved" : data.verdict === "REWORK" ? "needs rework" : "rejected"}`,
    message: `"${task.title}" — ${data.feedback.slice(0, 120)}`,
    link: `/tasks/${taskId}`,
  });

  await logActivity({
    userId: user.id,
    companyId: task.companyId,
    action: "REVIEW",
    entityType: "Task",
    entityId: taskId,
    entityName: task.title,
    details: { verdict: data.verdict, rating: data.rating ?? undefined },
  });

  broadcastTaskEvent({
    type: "TASK_MOVED",
    taskId: task.id,
    projectId: task.projectId,
    companyId: task.companyId,
    status: nextStatus,
    order: task.order,
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/reviews");
  revalidatePath("/kanban");
  return { id: review.id };
}

/** Mentor reviews a daily log. */
export async function reviewDailyLog(dailyLogId: string, values: ReviewValues) {
  const user = await requirePermission("review:create");
  const data = reviewSchema.parse(values);

  const log = await prisma.dailyLog.findUnique({ where: { id: dailyLogId } });
  if (!log) throw new Error("Daily log not found");
  assertCompanyAccess(user, log.companyId);

  await prisma.review.create({
    data: {
      companyId: log.companyId,
      targetType: "DAILY_LOG",
      targetId: dailyLogId,
      dailyLogId,
      revieweeId: log.studentId,
      reviewerId: user.id,
      verdict: data.verdict,
      rating: data.rating ?? null,
      feedback: data.feedback,
    },
  });

  await prisma.dailyLog.update({
    where: { id: dailyLogId },
    data: {
      status:
        data.verdict === "APPROVED"
          ? "APPROVED"
          : data.verdict === "REWORK"
            ? "REWORK"
            : "REJECTED",
    },
  });

  await notify({
    userId: log.studentId,
    type: "REVIEW_COMPLETED",
    title: `Daily report ${data.verdict.toLowerCase()}`,
    message: data.feedback.slice(0, 140),
    link: `/daily-logs/${dailyLogId}`,
  });

  await logActivity({
    userId: user.id,
    companyId: log.companyId,
    action: "REVIEW",
    entityType: "DailyLog",
    entityId: dailyLogId,
    details: { verdict: data.verdict, rating: data.rating ?? undefined },
  });

  revalidatePath("/daily-logs");
  revalidatePath(`/daily-logs/${dailyLogId}`);
  revalidatePath("/reviews");
}
