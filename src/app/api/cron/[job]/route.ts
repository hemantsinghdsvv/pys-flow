import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { snapshotAllStudents } from "@/lib/scoring";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron / scheduled-job endpoints. Callable by Vercel Cron, an OS scheduler,
 * or manually. Protected by CRON_SECRET (Bearer header or ?secret=).
 *
 *   GET /api/cron/snapshots           — compute daily PerformanceSnapshots
 *   GET /api/cron/mark-absences       — mark students absent for a working day
 *   GET /api/cron/reminders           — nudge students who haven't logged today
 *   GET /api/cron/login-reminder      — 9:30 AM IST: login & acknowledge tasks
 *   GET /api/cron/worklog-reminder    — 4:30 PM IST: update work log
 *   GET /api/cron/submission-reminder — 5:30 PM IST: submit before 6:30 PM
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true; // no secret configured ⇒ open (dev)
  const url = new URL(req.url);
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

/** Start-of-day UTC for a date (defaults to today). */
function utcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Returns true if the given date is a weekend or a holiday. */
async function isNonWorkingDay(date: Date): Promise<boolean> {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return true;
  const holiday = await prisma.holiday.findFirst({
    where: { date },
    select: { id: true },
  });
  return !!holiday;
}

/** Fetch all active students. */
async function getActiveStudents() {
  return prisma.user.findMany({
    where: { isSystemAdmin: false, isActive: true, deletedAt: null },
    select: { id: true, companyId: true },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ job: string }> }
) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { job } = await params;

  // ── snapshots ──────────────────────────────────────────────────────────
  if (job === "snapshots") {
    const count = await snapshotAllStudents();
    return NextResponse.json({ ok: true, job, snapshots: count });
  }

  // ── mark-absences ──────────────────────────────────────────────────────
  if (job === "mark-absences") {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const date = utcDay(dateParam ? new Date(dateParam) : new Date());

    if (await isNonWorkingDay(date)) {
      return NextResponse.json({ ok: true, job, skipped: "non-working day" });
    }

    const students = await prisma.user.findMany({
      where: { isSystemAdmin: false, isActive: true, deletedAt: null, companyId: { not: null } },
      select: { id: true, companyId: true },
    });

    let absents = 0;
    let notified = 0;
    for (const s of students) {
      if (!s.companyId) continue;
      const existing = await prisma.attendance.findUnique({
        where: { userId_date: { userId: s.id, date } },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.attendance.create({
        data: { userId: s.id, companyId: s.companyId, date, status: "ABSENT" },
      });
      absents++;

      const log = await prisma.dailyLog.findUnique({
        where: { studentId_date: { studentId: s.id, date } },
        select: { id: true },
      });
      if (!log) {
        await notify({
          userId: s.id,
          type: "MISSED_REPORT",
          title: "Missed daily report",
          message:
            "You have no daily report and were marked absent. Please submit and inform your mentor.",
          link: "/daily-logs/new",
        });
        notified++;
      }
    }
    return NextResponse.json({ ok: true, job, absents, notified });
  }

  // ── reminders (legacy) ─────────────────────────────────────────────────
  if (job === "reminders") {
    const today = utcDay();
    const students = await prisma.user.findMany({
      where: { isSystemAdmin: false, isActive: true, deletedAt: null },
      select: { id: true },
    });

    let reminded = 0;
    for (const s of students) {
      const log = await prisma.dailyLog.findUnique({
        where: { studentId_date: { studentId: s.id, date: today } },
        select: { id: true },
      });
      if (log) continue;

      const already = await prisma.notification.findFirst({
        where: { userId: s.id, type: "DAILY_REMINDER", createdAt: { gte: today } },
        select: { id: true },
      });
      if (already) continue;

      await notify({
        userId: s.id,
        type: "DAILY_REMINDER",
        title: "Submit your daily report",
        message: "Don't forget to log today's work before end of day.",
        link: "/daily-logs/new",
      });
      reminded++;
    }
    return NextResponse.json({ ok: true, job, reminded });
  }

  // ── login-reminder — 9:30 AM IST (4:00 AM UTC) ────────────────────────
  if (job === "login-reminder") {
    const today = utcDay();
    if (await isNonWorkingDay(today)) {
      return NextResponse.json({ ok: true, job, skipped: "non-working day" });
    }

    const students = await getActiveStudents();
    let reminded = 0;

    for (const s of students) {
      const timeline = await prisma.dailyTimeline.findUnique({
        where: { studentId_date: { studentId: s.id, date: today } },
        select: { loginAt: true },
      });
      if (timeline?.loginAt) continue; // already logged in

      const already = await prisma.notification.findFirst({
        where: { userId: s.id, type: "LOGIN_REMINDER", createdAt: { gte: today } },
        select: { id: true },
      });
      if (already) continue;

      await notify({
        userId: s.id,
        type: "LOGIN_REMINDER",
        title: "Good morning! Please login and acknowledge your tasks",
        message:
          "Please login to DRISHTI and acknowledge today's assigned tasks before 10:00 AM.",
        link: "/tasks",
      });
      reminded++;
    }
    return NextResponse.json({ ok: true, job, reminded });
  }

  // ── worklog-reminder — 4:30 PM IST (11:00 AM UTC) ─────────────────────
  if (job === "worklog-reminder") {
    const today = utcDay();
    if (await isNonWorkingDay(today)) {
      return NextResponse.json({ ok: true, job, skipped: "non-working day" });
    }

    const students = await getActiveStudents();
    let reminded = 0;

    for (const s of students) {
      const timeline = await prisma.dailyTimeline.findUnique({
        where: { studentId_date: { studentId: s.id, date: today } },
        select: { workLogUpdatedAt: true },
      });
      if (timeline?.workLogUpdatedAt) continue; // already updated work log

      const already = await prisma.notification.findFirst({
        where: { userId: s.id, type: "WORK_LOG_REMINDER", createdAt: { gte: today } },
        select: { id: true },
      });
      if (already) continue;

      await notify({
        userId: s.id,
        type: "WORK_LOG_REMINDER",
        title: "Please update your daily work log",
        message:
          "It's 4:30 PM — please update your daily work log to reflect today's progress.",
        link: "/daily-logs/new",
      });
      reminded++;
    }
    return NextResponse.json({ ok: true, job, reminded });
  }

  // ── submission-reminder — 5:30 PM IST (12:00 PM UTC) ──────────────────
  if (job === "submission-reminder") {
    const today = utcDay();
    if (await isNonWorkingDay(today)) {
      return NextResponse.json({ ok: true, job, skipped: "non-working day" });
    }

    const students = await getActiveStudents();
    let reminded = 0;

    for (const s of students) {
      const log = await prisma.dailyLog.findUnique({
        where: { studentId_date: { studentId: s.id, date: today } },
        select: { id: true },
      });
      if (log) continue; // already submitted

      const already = await prisma.notification.findFirst({
        where: { userId: s.id, type: "SUBMISSION_REMINDER", createdAt: { gte: today } },
        select: { id: true },
      });
      if (already) continue;

      await notify({
        userId: s.id,
        type: "SUBMISSION_REMINDER",
        title: "Please submit today's internship work before 6:30 PM",
        message:
          "Submission window is 5:30 PM – 6:30 PM. Please submit your daily report now.",
        link: "/daily-logs/new",
      });
      reminded++;
    }
    return NextResponse.json({ ok: true, job, reminded });
  }

  return NextResponse.json({ error: "Unknown job" }, { status: 404 });
}
