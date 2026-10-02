import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format, subDays } from "date-fns";
import {
  GraduationCap,
  FolderKanban,
  CheckCircle2,
  NotebookPen,
} from "lucide-react";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  TASK_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
} from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  TasksByStatusChart,
  ReportsTrendChart,
  AttendanceChart,
  TopStudentsChart,
  type NamedCount,
  type DatedCount,
} from "@/features/analytics/components/analytics-charts";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireUser();
  if (!can(user, "feature:analytics") || !can(user, "analytics:read")) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);

  const now = new Date();
  const trendStart = subDays(now, 13);
  trendStart.setUTCHours(0, 0, 0, 0);
  const attendanceStart = subDays(now, 29);
  attendanceStart.setUTCHours(0, 0, 0, 0);

  const [
    studentCount,
    activeProjects,
    completedTasks,
    reportsThisWeek,
    tasksGrouped,
    recentLogs,
    attendanceGrouped,
    topStudentsRaw,
  ] = await Promise.all([
    prisma.user.count({ where: { isSystemAdmin: false, ...scope } }),
    prisma.project.count({ where: { ...scope, deletedAt: null, status: "ACTIVE" } }),
    prisma.task.count({ where: { ...scope, deletedAt: null, status: "COMPLETED" } }),
    prisma.dailyLog.count({
      where: { ...scope, deletedAt: null, date: { gte: subDays(now, 7) } },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { ...scope, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.dailyLog.findMany({
      where: { ...scope, deletedAt: null, date: { gte: trendStart } },
      select: { date: true },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { ...scope, date: { gte: attendanceStart } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        ...scope,
        deletedAt: null,
        status: "COMPLETED",
        assigneeId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { assigneeId: "desc" } },
      take: 5,
    }),
  ]);

  const tasksByStatus: NamedCount[] = tasksGrouped.map((g) => ({
    name: TASK_STATUS_LABELS[g.status],
    value: g._count._all,
  }));

  // Bucket reports per day across the 14-day window.
  const dayBuckets = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    dayBuckets.set(format(subDays(now, i), "d MMM"), 0);
  }
  for (const log of recentLogs) {
    const key = format(log.date, "d MMM");
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const reportsTrend: DatedCount[] = Array.from(dayBuckets, ([date, count]) => ({
    date,
    count,
  }));

  const attendanceBreakdown: NamedCount[] = attendanceGrouped.map((g) => ({
    name: ATTENDANCE_STATUS_LABELS[g.status],
    value: g._count._all,
  }));

  const topIds = topStudentsRaw
    .map((t) => t.assigneeId)
    .filter((id): id is string => Boolean(id));
  const topUsers = topIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(topUsers.map((u) => [u.id, u.name]));
  const topStudents: NamedCount[] = topStudentsRaw
    .filter((t) => t.assigneeId)
    .map((t) => ({
      name: nameById.get(t.assigneeId as string) ?? "Unknown",
      value: t._count._all,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Program-wide performance across tasks, reports, and attendance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Students" value={studentCount} icon={GraduationCap} />
        <StatCard
          title="Active projects"
          value={activeProjects}
          icon={FolderKanban}
        />
        <StatCard
          title="Tasks completed"
          value={completedTasks}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          title="Reports this week"
          value={reportsThisWeek}
          icon={NotebookPen}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksByStatusChart data={tasksByStatus} />
        <ReportsTrendChart data={reportsTrend} />
        <AttendanceChart data={attendanceBreakdown} />
        <TopStudentsChart data={topStudents} />
      </div>
    </div>
  );
}
