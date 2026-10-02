"use server";

import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermission, companyFilter } from "@/lib/access";
import { askOllama } from "@/lib/ai";

export type Insight = {
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
};

export type InsightsResult = {
  metrics: {
    students: number;
    openTasks: number;
    overdueTasks: number;
    reportsLast7: number;
    atRiskStudents: number;
    pendingReviews: number;
  };
  insights: Insight[];
  narrative: string | null;
  source: "ollama" | "heuristic";
};

/** Compute program-health metrics and derive insights (LLM-augmented if available). */
export async function generateInsights(): Promise<InsightsResult> {
  const user = await requirePermission("analytics:read");
  const scope = await companyFilter(user);
  const now = new Date();

  const [
    students,
    openTasks,
    overdueTasks,
    reportsLast7,
    pendingReviews,
    activeStudentIds,
    recentReporterRows,
  ] = await Promise.all([
    prisma.user.count({ where: { isSystemAdmin: false, ...scope } }),
    prisma.task.count({
      where: {
        ...scope,
        deletedAt: null,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    }),
    prisma.task.count({
      where: {
        ...scope,
        deletedAt: null,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        deadline: { lt: now },
      },
    }),
    prisma.dailyLog.count({
      where: { ...scope, deletedAt: null, date: { gte: subDays(now, 7) } },
    }),
    prisma.task.count({
      where: {
        ...scope,
        deletedAt: null,
        status: "REVIEW",
      },
    }),
    prisma.user.findMany({
      where: { isSystemAdmin: false, isActive: true, ...scope },
      select: { id: true },
    }),
    prisma.dailyLog.findMany({
      where: { ...scope, deletedAt: null, date: { gte: subDays(now, 3) } },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
  ]);

  const reportedIds = new Set(recentReporterRows.map((r) => r.studentId));
  const atRiskStudents = activeStudentIds.filter(
    (s) => !reportedIds.has(s.id)
  ).length;

  const metrics = {
    students,
    openTasks,
    overdueTasks,
    reportsLast7,
    atRiskStudents,
    pendingReviews,
  };

  // ── Heuristic insights ──
  const insights: Insight[] = [];

  if (overdueTasks > 0) {
    insights.push({
      title: `${overdueTasks} task${overdueTasks > 1 ? "s" : ""} overdue`,
      detail:
        "These tasks are past their deadline and still open. Consider reassigning or renegotiating the timeline.",
      severity: overdueTasks > 5 ? "critical" : "warning",
    });
  }

  if (atRiskStudents > 0) {
    const pct = students ? Math.round((atRiskStudents / students) * 100) : 0;
    insights.push({
      title: `${atRiskStudents} student${atRiskStudents > 1 ? "s" : ""} not reporting`,
      detail: `${pct}% of active students have no daily report in the last 3 days. Nudge them to log progress.`,
      severity: pct >= 40 ? "critical" : "warning",
    });
  }

  if (pendingReviews > 0) {
    insights.push({
      title: `${pendingReviews} item${pendingReviews > 1 ? "s" : ""} awaiting review`,
      detail:
        "Work sitting in Review/Testing blocks students from progressing. Clear the review queue.",
      severity: pendingReviews > 10 ? "warning" : "info",
    });
  }

  if (reportsLast7 === 0 && students > 0) {
    insights.push({
      title: "No daily reports this week",
      detail:
        "Not a single report was submitted in the last 7 days. Check whether reminders are reaching students.",
      severity: "critical",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Program is on track",
      detail:
        "No overdue tasks, students are reporting, and the review queue is under control. Keep it up.",
      severity: "info",
    });
  }

  // ── Optional LLM narrative ──
  const prompt = [
    "You are an internship program coordinator's assistant.",
    "Given these metrics, write 3-4 short, actionable sentences of advice.",
    "Be concrete and encouraging. Do not repeat the numbers verbatim as a list.",
    "",
    `Active students: ${students}`,
    `Open tasks: ${openTasks} (overdue: ${overdueTasks})`,
    `Daily reports in last 7 days: ${reportsLast7}`,
    `Students not reporting in last 3 days: ${atRiskStudents}`,
    `Items awaiting review: ${pendingReviews}`,
  ].join("\n");

  const narrative = await askOllama(prompt);

  return {
    metrics,
    insights,
    narrative,
    source: narrative ? "ollama" : "heuristic",
  };
}
