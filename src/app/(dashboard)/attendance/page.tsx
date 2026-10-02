import type { Metadata } from "next";
import { redirect } from "next/navigation";
// trigger reload
import { format } from "date-fns";
import { UserCheck, UserX, Plane, CalendarOff } from "lucide-react";
import { requireUser, companyScope, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  AttendanceBoard,
  type AttendanceRow,
} from "@/features/attendance/components/attendance-board";
import { AttendanceDatePicker } from "@/features/attendance/components/attendance-date-picker";

export const metadata: Metadata = { title: "Attendance" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "feature:attendance") && !can(user, "attendance:read")) {
    redirect("/dashboard");
  }

  const scope = await companyFilter(user);
  const activeCompanyId = await companyScope(user);

  const { date: dateParam } = await searchParams;
  const date =
    dateParam && DATE_RE.test(dateParam)
      ? dateParam
      : new Date().toISOString().slice(0, 10);
  const dateObj = new Date(date);

  const [profiles, records] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { ...scope, user: { deletedAt: null, isActive: true } },
      select: {
        rollNumber: true,
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.attendance.findMany({
      where: { ...scope, date: dateObj },
      select: { userId: true, status: true },
    }),
  ]);

  const statusByUser = new Map(records.map((r) => [r.userId, r.status]));

  const rows: AttendanceRow[] = profiles.map((p) => ({
    userId: p.user.id,
    name: p.user.name,
    image: p.user.image,
    rollNumber: p.rollNumber,
    status: statusByUser.get(p.user.id) ?? null,
  }));

  const counts = {
    present: rows.filter((r) => r.status === "PRESENT").length,
    absent: rows.filter((r) => r.status === "ABSENT").length,
    leave: rows.filter((r) => r.status === "LEAVE").length,
    unmarked: rows.filter((r) => r.status === null).length,
  };

  const canManage = can(user, "attendance:manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description={`Attendance for ${format(dateObj, "EEEE, d MMM yyyy")}.`}
        actions={<AttendanceDatePicker date={date} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Present"
          value={counts.present}
          icon={UserCheck}
          accent="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          title="Absent"
          value={counts.absent}
          icon={UserX}
          accent="bg-red-500/10 text-red-600"
        />
        <StatCard
          title="On leave"
          value={counts.leave}
          icon={Plane}
          accent="bg-sky-500/10 text-sky-600"
        />
        <StatCard
          title="Not marked"
          value={counts.unmarked}
          icon={CalendarOff}
        />
      </div>

      <AttendanceBoard
        rows={rows}
        date={date}
        canManage={canManage}
        companyId={activeCompanyId}
      />
    </div>
  );
}

