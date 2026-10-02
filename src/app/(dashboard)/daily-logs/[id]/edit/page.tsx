import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import {
  DailyLogForm,
  type DailyLogProjectOption,
} from "@/features/daily-logs/components/daily-log-form";
import type { DailyLogValues } from "@/features/daily-logs/schemas";

export const metadata: Metadata = { title: "Edit Report" };

export default async function EditDailyLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const log = await prisma.dailyLog.findFirst({
    where: { id, deletedAt: null },
  });
  if (!log) notFound();
  assertCompanyAccess(user, log.companyId);
  if (log.studentId !== user.id || log.status === "APPROVED") {
    redirect(`/daily-logs/${id}`);
  }

  const projects = await prisma.project.findMany({
    where: { deletedAt: null, students: { some: { userId: user.id } } },
    select: {
      id: true,
      name: true,
      tasks: {
        where: { deletedAt: null, assigneeId: user.id },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });
  const options: DailyLogProjectOption[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    tasks: p.tasks,
  }));

  const initial: DailyLogValues = {
    date: log.date.toISOString().slice(0, 10),
    projectId: log.projectId ?? "",
    taskId: log.taskId ?? "",
    hoursWorked: log.hoursWorked,
    description: log.description,
    achievements: log.achievements ?? "",
    blockers: log.blockers ?? "",
    tomorrowPlan: log.tomorrowPlan ?? "",
    repositoryLink: log.repositoryLink ?? "",
    commitLinks: log.commitLinks,
    deploymentLink: log.deploymentLink ?? "",
    notes: log.notes ?? "",
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Edit daily report" />
      <DailyLogForm projects={options} initial={initial} logId={log.id} />
    </div>
  );
}
