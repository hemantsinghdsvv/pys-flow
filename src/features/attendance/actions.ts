"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertCompanyAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import {
  markAttendanceSchema,
  type MarkAttendanceValues,
} from "@/features/attendance/schemas";

/** Set (or update) a student's attendance status for a given date. */
export async function markAttendance(values: MarkAttendanceValues) {
  const user = await requirePermission("attendance:manage");
  const data = markAttendanceSchema.parse(values);

  const target = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, companyId: true, name: true },
  });
  if (!target || !target.companyId) {
    throw new Error("User not found or has no company.");
  }
  assertCompanyAccess(user, target.companyId);

  const date = new Date(data.date);

  await prisma.attendance.upsert({
    where: { userId_date: { userId: target.id, date } },
    create: {
      userId: target.id,
      companyId: target.companyId,
      date,
      status: data.status,
    },
    update: { status: data.status },
  });

  await logActivity({
    userId: user.id,
    companyId: target.companyId,
    action: "STATUS_CHANGE",
    entityType: "Attendance",
    entityName: target.name,
    details: { date: data.date, status: data.status },
  });

  revalidatePath("/attendance");
}

/**
 * Mark all currently-unmarked active students as PRESENT for the given date.
 * Skips students who already have any status set.
 */
export async function markAllPresent(
  date: string,
  companyId?: string | null
): Promise<{ count: number }> {
  const actor = await requirePermission("attendance:manage");

  const dateObj = new Date(date);
  const scopeFilter = companyId ? { companyId } : {};

  // All active students in scope
  const profiles = await prisma.studentProfile.findMany({
    where: {
      ...scopeFilter,
      user: { isActive: true, deletedAt: null },
    },
    select: {
      user: { select: { id: true, companyId: true } },
    },
  });

  if (profiles.length === 0) return { count: 0 };

  // Find those already marked
  const existing = await prisma.attendance.findMany({
    where: { ...scopeFilter, date: dateObj },
    select: { userId: true },
  });
  const markedIds = new Set(existing.map((r) => r.userId));

  const unmarked = profiles.filter((p) => !markedIds.has(p.user.id));
  if (unmarked.length === 0) return { count: 0 };

  // Bulk upsert in a transaction
  await prisma.$transaction(
    unmarked.map((p) =>
      prisma.attendance.upsert({
        where: {
          userId_date: { userId: p.user.id, date: dateObj },
        },
        create: {
          userId: p.user.id,
          companyId: p.user.companyId!,
          date: dateObj,
          status: "PRESENT",
        },
        update: {},
      })
    )
  );

  await logActivity({
    userId: actor.id,
    companyId: companyId ?? null,
    action: "STATUS_CHANGE",
    entityType: "Attendance",
    entityName: "All students",
    details: { date, status: "PRESENT", count: unmarked.length },
  });

  revalidatePath("/attendance");
  return { count: unmarked.length };
}
