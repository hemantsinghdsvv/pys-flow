"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, requirePermission, assertCompanyAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { notify, notifyMany } from "@/lib/notify";
import { dailyLogSchema, type DailyLogValues } from "@/features/daily-logs/schemas";

function normalize(data: DailyLogValues) {
  return {
    date: new Date(data.date),
    projectId: data.projectId || null,
    taskId: data.taskId || null,
    hoursWorked: data.hoursWorked,
    description: data.description,
    achievements: data.achievements || null,
    blockers: data.blockers || null,
    tomorrowPlan: data.tomorrowPlan || null,
    repositoryLink: data.repositoryLink || null,
    commitLinks: (data.commitLinks ?? []).filter(Boolean),
    deploymentLink: data.deploymentLink || null,
    driveLink: data.driveLink || null,
    notes: data.notes || null,
  };
}

/** A student submits their daily report. One log per student per date. */
export async function createDailyLog(values: DailyLogValues) {
  const user = await requirePermission("dailylog:create");
  if (!user.companyId) throw new Error("Your account has no company.");
  const data = dailyLogSchema.parse(values);
  const normalized = normalize(data);

  const existing = await prisma.dailyLog.findUnique({
    where: { studentId_date: { studentId: user.id, date: normalized.date } },
    select: { id: true },
  });
  if (existing) {
    throw new Error("You already submitted a report for this date. Edit it instead.");
  }

  const log = await prisma.dailyLog.create({
    data: {
      ...normalized,
      studentId: user.id,
      companyId: user.companyId,
      status: "SUBMITTED",
    },
  });

  // Update DailyTimeline.submittedAt and workLogUpdatedAt
  const today = new Date(normalized.date);
  await prisma.dailyTimeline.upsert({
    where: { studentId_date: { studentId: user.id, date: today } },
    create: {
      studentId: user.id,
      date: today,
      submittedAt: new Date(),
      workLogUpdatedAt: new Date(),
    },
    update: {
      submittedAt: new Date(),
      workLogUpdatedAt: new Date(),
    },
  });

  await logActivity({
    userId: user.id,
    companyId: user.companyId,
    action: "SUBMIT",
    entityType: "DailyLog",
    entityId: log.id,
  });

  // ── Send SUBMISSION_CONFIRMED to student + mentor + admin + coordinator ──
  const studentNotification = notify({
    userId: user.id,
    type: "SUBMISSION_CONFIRMED",
    title: "Daily report submitted",
    message: `Your report for ${normalized.date.toLocaleDateString("en-IN", { day: "numeric", month: "long" })} was submitted successfully.`,
    link: `/daily-logs/${log.id}`,
  });

  // Find mentors for student's active projects
  const projectStudents = await prisma.projectStudent.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  const projectIds = projectStudents.map((ps) => ps.projectId);

  const mentors = await prisma.projectMentor.findMany({
    where: { projectId: { in: projectIds } },
    select: { userId: true },
  });
  const mentorIds = [...new Set(mentors.map((m) => m.userId))];

  // Find company admins and coordinators in the same company
  const staffUsers = await prisma.user.findMany({
    where: {
      companyId: user.companyId,
      
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  const staffIds = staffUsers.map((u) => u.id);

  const allRecipientIds = [...new Set([...mentorIds, ...staffIds])];

  const staffMentorNotification =
    allRecipientIds.length > 0
      ? notifyMany(allRecipientIds, {
          type: "SUBMISSION_CONFIRMED",
          title: `${user.name} submitted daily report`,
          message: `${user.name} submitted their internship report for ${normalized.date.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`,
          link: `/daily-logs/${log.id}`,
        })
      : Promise.resolve();

  // Fire-and-forget — don't block the response
  await Promise.allSettled([studentNotification, staffMentorNotification]);

  revalidatePath("/daily-logs");
  revalidatePath("/reviews");
  return { id: log.id };
}

export async function updateDailyLog(id: string, values: DailyLogValues) {
  const user = await requireUser();
  const existing = await prisma.dailyLog.findUnique({ where: { id } });
  if (!existing) throw new Error("Daily log not found");
  assertCompanyAccess(user, existing.companyId);
  if (existing.studentId !== user.id) {
    throw new Error("You can only edit your own reports.");
  }
  if (existing.status === "APPROVED") {
    throw new Error("Approved reports can no longer be edited.");
  }

  const data = dailyLogSchema.parse(values);
  const normalized = normalize(data);

  await prisma.dailyLog.update({
    where: { id },
    data: {
      ...normalized,
      date: existing.date, // date is the natural key — keep it fixed on edit
      status: "SUBMITTED", // editing resubmits the report for review
    },
  });

  await logActivity({
    userId: user.id,
    companyId: existing.companyId,
    action: "UPDATE",
    entityType: "DailyLog",
    entityId: id,
  });

  revalidatePath("/daily-logs");
  revalidatePath(`/daily-logs/${id}`);
  revalidatePath("/reviews");
}

export async function deleteDailyLog(id: string) {
  const user = await requireUser();
  const existing = await prisma.dailyLog.findUnique({ where: { id } });
  if (!existing) throw new Error("Daily log not found");
  assertCompanyAccess(user, existing.companyId);
  if (existing.studentId !== user.id && user.role === "INTERN") {
    throw new Error("You can only delete your own reports.");
  }

  await prisma.dailyLog.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    companyId: existing.companyId,
    action: "DELETE",
    entityType: "DailyLog",
    entityId: id,
  });

  revalidatePath("/daily-logs");
  redirect("/daily-logs");
}
