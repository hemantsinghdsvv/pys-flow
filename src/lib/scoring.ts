import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Accountability / performance scoring engine.
 *
 * Every metric is a 0-100 score. The overall score is a weighted sum, then
 * bucketed into a traffic-light band. All calculations are pure rule-based
 * statistics — no external services required.
 */

export const SCORE_WEIGHTS = {
  submission: 0.25, // daily reports submitted ÷ working days
  attendance: 0.15, // present days ÷ working days
  taskCompletion: 0.25, // completed tasks ÷ assigned tasks
  review: 0.15, // avg mentor rating (1-5) → 0-100
  deadline: 0.1, // tasks finished on time ÷ tasks with deadline
  github: 0.1, // commit/PR activity trend
} as const;

export type Band = "GREEN" | "YELLOW" | "RED";

export function bandFor(score: number): Band {
  if (score >= 75) return "GREEN";
  if (score >= 50) return "YELLOW";
  return "RED";
}

export type StudentScore = {
  studentId: string;
  submissionScore: number;
  attendanceScore: number;
  taskCompletionScore: number;
  reviewScore: number;
  deadlineScore: number;
  githubScore: number;
  overallScore: number;
  band: Band;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Count working days (Mon–Fri, excluding holidays) between two dates inclusive. */
function workingDaysBetween(
  start: Date,
  end: Date,
  holidays: Set<string>
): number {
  let count = 0;
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  );
  while (cursor <= last) {
    const dow = cursor.getUTCDay();
    const key = cursor.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidays.has(key)) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/**
 * Compute the performance score for a single student over a trailing window.
 * `windowDays` defaults to 30 calendar days.
 */
export async function computeStudentScore(
  studentId: string,
  companyId: string,
  opts: { windowDays?: number; asOf?: Date } = {}
): Promise<StudentScore> {
  const windowDays = opts.windowDays ?? 30;
  const asOf = opts.asOf ?? new Date();
  const end = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate())
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (windowDays - 1));

  const [
    holidays,
    logCount,
    presentCount,
    assignedTasks,
    completedTasks,
    deadlineTasks,
    onTimeTasks,
    reviewAgg,
    logsWithCommits,
  ] = await Promise.all([
    prisma.holiday.findMany({
      where: {
        OR: [{ companyId }, { companyId: null }],
        date: { gte: start, lte: end },
      },
      select: { date: true },
    }),
    prisma.dailyLog.count({
      where: { studentId, deletedAt: null, date: { gte: start, lte: end } },
    }),
    prisma.attendance.count({
      where: {
        userId: studentId,
        status: { in: ["PRESENT", "HALF_DAY"] },
        date: { gte: start, lte: end },
      },
    }),
    prisma.task.count({
      where: { assigneeId: studentId, deletedAt: null, status: { not: "CANCELLED" } },
    }),
    prisma.task.count({
      where: { assigneeId: studentId, deletedAt: null, status: "COMPLETED" },
    }),
    prisma.task.count({
      where: {
        assigneeId: studentId,
        deletedAt: null,
        status: "COMPLETED",
        deadline: { not: null },
      },
    }),
    prisma.task.findMany({
      where: {
        assigneeId: studentId,
        deletedAt: null,
        status: "COMPLETED",
        deadline: { not: null },
        completedAt: { not: null },
      },
      select: { deadline: true, completedAt: true },
    }),
    prisma.review.aggregate({
      where: {
        revieweeId: studentId,
        deletedAt: null,
        rating: { not: null },
        createdAt: { gte: start },
      },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.dailyLog.findMany({
      where: { studentId, deletedAt: null, date: { gte: start, lte: end } },
      select: { commitLinks: true },
    }),
  ]);

  const holidaySet = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10))
  );
  const workingDays = Math.max(1, workingDaysBetween(start, end, holidaySet));

  // Submission: reports submitted ÷ working days.
  const submissionScore = clamp((logCount / workingDays) * 100);

  // Attendance: present/half days ÷ working days.
  const attendanceScore = clamp((presentCount / workingDays) * 100);

  // Task completion: completed ÷ assigned.
  const taskCompletionScore = assignedTasks
    ? clamp((completedTasks / assignedTasks) * 100)
    : 0;

  // Review: avg 1-5 rating → 0-100. No reviews yet ⇒ neutral 60.
  const reviewScore =
    reviewAgg._count.rating && reviewAgg._avg.rating != null
      ? clamp((reviewAgg._avg.rating / 5) * 100)
      : 60;

  // Deadline compliance: finished-on-time ÷ completed-with-deadline.
  const onTime = onTimeTasks.filter(
    (t) => t.completedAt && t.deadline && t.completedAt <= t.deadline
  ).length;
  const deadlineScore = deadlineTasks
    ? clamp((onTime / deadlineTasks) * 100)
    : 100;

  // GitHub activity: commit links logged, capped. ~1.5 commits/working day = full.
  const totalCommits = logsWithCommits.reduce(
    (sum, l) => sum + l.commitLinks.length,
    0
  );
  const githubScore = clamp((totalCommits / (workingDays * 1.5)) * 100);

  const overallScore = clamp(
    submissionScore * SCORE_WEIGHTS.submission +
      attendanceScore * SCORE_WEIGHTS.attendance +
      taskCompletionScore * SCORE_WEIGHTS.taskCompletion +
      reviewScore * SCORE_WEIGHTS.review +
      deadlineScore * SCORE_WEIGHTS.deadline +
      githubScore * SCORE_WEIGHTS.github
  );

  return {
    studentId,
    submissionScore,
    attendanceScore,
    taskCompletionScore,
    reviewScore,
    deadlineScore,
    githubScore,
    overallScore,
    band: bandFor(overallScore),
  };
}

/**
 * Compute and persist a daily PerformanceSnapshot for every active student
 * (optionally scoped to one company). Idempotent per student per day.
 * Returns the number of snapshots written.
 */
export async function snapshotAllStudents(companyId?: string): Promise<number> {
  const students = await prisma.user.findMany({
    where: {
      isSystemAdmin: false,
      isActive: true,
      deletedAt: null,
      companyId: companyId ?? { not: null },
    },
    select: { id: true, companyId: true },
  });

  const today = new Date();
  const date = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  let written = 0;
  for (const s of students) {
    if (!s.companyId) continue;
    const score = await computeStudentScore(s.id, s.companyId, { asOf: today });
    await prisma.performanceSnapshot.upsert({
      where: { studentId_date: { studentId: s.id, date } },
      create: {
        studentId: s.id,
        companyId: s.companyId,
        date,
        submissionScore: score.submissionScore,
        attendanceScore: score.attendanceScore,
        taskCompletionScore: score.taskCompletionScore,
        reviewScore: score.reviewScore,
        deadlineScore: score.deadlineScore,
        githubScore: score.githubScore,
        overallScore: score.overallScore,
        band: score.band,
      },
      update: {
        submissionScore: score.submissionScore,
        attendanceScore: score.attendanceScore,
        taskCompletionScore: score.taskCompletionScore,
        reviewScore: score.reviewScore,
        deadlineScore: score.deadlineScore,
        githubScore: score.githubScore,
        overallScore: score.overallScore,
        band: score.band,
      },
    });
    written++;
  }
  return written;
}
