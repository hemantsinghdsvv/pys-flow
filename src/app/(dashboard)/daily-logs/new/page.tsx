import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import {
  DailyLogForm,
  type DailyLogProjectOption,
} from "@/features/daily-logs/components/daily-log-form";

export const metadata: Metadata = { title: "New Report" };

export default async function NewDailyLogPage() {
  const user = await requireUser();
  if (!can(user, "dailylog:create")) redirect("/daily-logs");

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      students: { some: { userId: user.id } },
    },
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="New daily report"
        description="Log your hours, progress, blockers, and plan for tomorrow."
      />
      <DailyLogForm projects={options} />
    </div>
  );
}
