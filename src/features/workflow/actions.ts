"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { logActivity } from "@/lib/activity";

/** Get today's date at midnight UTC */
function utcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Auto-called when a student's dashboard page loads.
 * Records login time in DailyTimeline and marks Attendance as PRESENT.
 * Idempotent — only sets values if they are null for today.
 */
export async function recordLoginTime(): Promise<void> {
  const user = await requireUser();
  if (user.role !== "INTERN") return;
  if (!user.companyId) return;

  const today = utcDay();
  const now = new Date();

  // Upsert DailyTimeline — only set loginAt if not already set
  const existing = await prisma.dailyTimeline.findUnique({
    where: { studentId_date: { studentId: user.id, date: today } },
    select: { id: true, loginAt: true },
  });

  if (!existing) {
    await prisma.dailyTimeline.create({
      data: {
        studentId: user.id,
        date: today,
        loginAt: now,
      },
    });
  }
  // If already exists and loginAt is already set, don't overwrite

  // Upsert Attendance as PRESENT with loginAt
  await prisma.attendance.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    create: {
      userId: user.id,
      companyId: user.companyId,
      date: today,
      status: "PRESENT",
      loginAt: now,
    },
    update: {
      // Only set loginAt if not already recorded
      status: "PRESENT",
      loginAt: existing?.loginAt ?? now,
    },
  });
}

/**
 * Student acknowledges a specific task for today.
 * Records ON_TIME (before 10 AM) or LATE status.
 * Idempotent — throws if already acknowledged today.
 */
export async function acknowledgeTask(taskId: string): Promise<{ status: "ON_TIME" | "LATE" }> {
  const user = await requireUser();
  if (user.role !== "INTERN") {
    throw new Error("Only students can acknowledge tasks.");
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId, deletedAt: null },
    select: { id: true, title: true, assigneeId: true, companyId: true },
  });
  if (!task) throw new Error("Task not found.");
  if (task.assigneeId !== user.id) {
    throw new Error("You can only acknowledge tasks assigned to you.");
  }

  const today = utcDay();
  const now = new Date();

  // Check if already acknowledged today
  const alreadyAcked = await prisma.taskAcknowledgement.findUnique({
    where: { taskId_studentId_date: { taskId, studentId: user.id, date: today } },
    select: { id: true, status: true },
  });
  if (alreadyAcked) {
    return { status: alreadyAcked.status };
  }

  // ON_TIME = before 10:00 AM IST (4:30 AM UTC)
  const hourUTC = now.getUTCHours();
  const minuteUTC = now.getUTCMinutes();
  const isOnTime = hourUTC < 4 || (hourUTC === 4 && minuteUTC < 30); // 10:00 AM IST = 04:30 UTC
  const ackStatus: "ON_TIME" | "LATE" = isOnTime ? "ON_TIME" : "LATE";

  await prisma.taskAcknowledgement.create({
    data: {
      taskId,
      studentId: user.id,
      date: today,
      status: ackStatus,
    },
  });

  await logActivity({
    userId: user.id,
    companyId: task.companyId,
    action: "SUBMIT",
    entityType: "TaskAcknowledgement",
    entityId: taskId,
    entityName: task.title,
    details: { status: ackStatus },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  return { status: ackStatus };
}

/**
 * Student clicks "End Work Day".
 * Records logout time and calculates total working minutes.
 */
export async function endWorkDay(): Promise<{ workingMinutes: number }> {
  const user = await requireUser();
  if (user.role !== "INTERN") {
    throw new Error("Only students can end the work day.");
  }

  const today = utcDay();
  const now = new Date();

  const timeline = await prisma.dailyTimeline.findUnique({
    where: { studentId_date: { studentId: user.id, date: today } },
    select: { id: true, loginAt: true, logoutAt: true },
  });

  if (!timeline) {
    throw new Error("No timeline found for today. Please ensure your login was tracked.");
  }
  if (timeline.logoutAt) {
    throw new Error("You have already ended your work day.");
  }

  const loginAt = timeline.loginAt ?? now;
  const workingMinutes = Math.round((now.getTime() - loginAt.getTime()) / 60000);

  await prisma.dailyTimeline.update({
    where: { id: timeline.id },
    data: { logoutAt: now, workingMinutes },
  });

  // Also update attendance
  await prisma.attendance.update({
    where: { userId_date: { userId: user.id, date: today } },
    data: { logoutAt: now, workingMinutes },
  });

  await logActivity({
    userId: user.id,
    companyId: user.companyId!,
    action: "LOGOUT",
    entityType: "WorkDay",
    entityName: "End Work Day",
    details: { workingMinutes },
  });

  revalidatePath("/dashboard");
  return { workingMinutes };
}
