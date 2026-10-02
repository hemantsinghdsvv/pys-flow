import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  DailyLogsTable,
  type DailyLogRow,
} from "@/features/daily-logs/components/daily-logs-table";

export const metadata: Metadata = { title: "Daily Logs" };

export default async function DailyLogsPage() {
  const user = await requireUser();
  if (
    !can(user, "feature:dailylogs") &&
    !can(user, "dailylog:read-own") &&
    !can(user, "dailylog:read")
  ) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);
  const canReadAll = can(user, "dailylog:read");
  const canCreate = can(user, "dailylog:create");

  const where: Prisma.DailyLogWhereInput = {
    ...scope,
    deletedAt: null,
    ...(canReadAll ? {} : { studentId: user.id }),
  };

  const logs = await prisma.dailyLog.findMany({
    where,
    include: {
      student: { select: { name: true, image: true } },
      project: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  const rows: DailyLogRow[] = logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString(),
    studentName: l.student.name,
    studentImage: l.student.image,
    projectName: l.project?.name ?? null,
    hoursWorked: l.hoursWorked,
    status: l.status,
  }));

  return (
    <>
      <PageHeader
        title="Daily Logs"
        description={
          canReadAll
            ? "Daily reports submitted by interns across your projects."
            : "Your daily work reports. Submit one every working day."
        }
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/daily-logs/new">
                <Plus className="size-4" /> New report
              </Link>
            </Button>
          )
        }
      />
      <DailyLogsTable data={rows} showStudent={canReadAll} />
    </>
  );
}
