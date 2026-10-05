import type { Metadata } from "next";
import type { Department, User } from "@prisma/client";
import Link from "next/link";
import {
  Building2,
  FolderKanban,
  GraduationCap,
  Layers,
  ListTodo,
  LogIn,
  CheckCircle2,
  FileText,
  LogOut,
  Timer,
  Clock,
  ShieldCheck,
  Compass,
} from "lucide-react";
import { format } from "date-fns";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EndWorkDayButton } from "@/features/workflow/end-work-day-button";
import { recordLoginTime } from "@/features/workflow/actions";
import { cookies } from "next/headers";

import { LeadDashboardView, MemberDashboardView } from "@/features/dashboard/components/role-views";
import { ExecutiveDashboardView } from "@/features/dashboard/components/executive-dashboard-view";

export const metadata: Metadata = { title: "Dashboard | Pragya Yog School" };

function formatTime(dt: Date | null | undefined): string {
  if (!dt) return "—";
  return format(dt, "hh:mm a");
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = await companyFilter(user);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const hasDashboardAccess = can(user, "feature:dashboard");
  const hasDailyLogsAccess = can(user, "feature:dailylogs");

  // Determine active hierarchy level
  const activeHierarchy =
    user.hierarchyLevel ||
    (user.isSystemAdmin === true ? 1 : user.role === "SENIOR" ? 2 : user.role === "EXECUTIVE" ? 3 : 4);

  const isAdmin = activeHierarchy === 1 || user.isSystemAdmin === true;
  const isLead = activeHierarchy === 2;

  const token = (await cookies()).get("pragya_jwt")?.value;

  // ── 1. If Administrator / CEO / Founder: Render Executive Command Center ────
  if (isAdmin) {
    const [
      adminProjects,
      adminTasks,
      dbDepartments,
      recentActivities,
      totalStaffCount,
      reportsTodayCount,
    ] = await Promise.all([
      prisma.project.findMany({
        where: { ...scope },
        include: { tasks: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.task.findMany({
        where: { ...scope },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true, designation: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: { deadline: "asc" },
      }),
      prisma.department.findMany({
        include: {
          users: { select: { id: true } },
        },
      }),
      prisma.activityLog.findMany({
        where: { ...scope },
        include: {
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.user.count({ where: { ...scope } }),
      hasDailyLogsAccess
        ? prisma.dailyLog.count({
            where: { ...scope, date: today },
          })
        : Promise.resolve(0),
    ]);

    const departmentSummaries = dbDepartments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      staffCount: d.users.length,
      taskCount: adminTasks.filter(
        (t) => t.assignee && d.users.some((u) => u.id === t.assignee?.id)
      ).length,
    }));

    return (
      <div className="space-y-6">
        <ExecutiveDashboardView
          currentUser={{
            id: user.id,
            name: user.name,
            email: user.email,
            designation: user.designation,
            isSystemAdmin: user.isSystemAdmin,
          }}
          projects={adminProjects as any}
          tasks={adminTasks as any}
          departments={departmentSummaries}
          recentActivities={recentActivities as any}
          reportsTodayCount={reportsTodayCount}
          totalStaffCount={totalStaffCount}
        />
      </div>
    );
  }

  // ── 2. For Leads, Staff, and Interns ─────────────────────────────────────────
  const [openTasks, projectsCount, studentsCount, batchesCount] = await Promise.all([
    prisma.task.count({
      where: {
        ...scope,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        ...(user.role === "INTERN" ? { assigneeId: user.id } : {}),
      },
    }),
    prisma.project.count({ where: { ...scope } }),
    prisma.user.count({ where: { isSystemAdmin: false, ...scope } }),
    prisma.batch.count({ where: { ...scope } }),
  ]);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const userDepartment = dbUser?.departmentId
    ? await prisma.department.findUnique({ where: { id: dbUser.departmentId } })
    : null;

  let roleTasks: any[] = [];
  let roleProjects: any[] = [];
  let teamMembers: User[] = [];

  if (dbUser?.departmentId) {
    teamMembers = await prisma.user.findMany({
      where: { departmentId: dbUser.departmentId, ...scope } as any,
    });
  }

  roleTasks = await prisma.task.findMany({
    where: {
      ...scope,
      OR: [{ assigneeId: user.id }, { createdById: user.id }],
    },
    include: { assignee: true },
  });

  const projectIds = Array.from(new Set(roleTasks.map((t) => t.projectId).filter(Boolean))) as string[];
  roleProjects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    include: { tasks: true },
  });

  // Student timeline & acknowledgements
  let timeline: {
    loginAt: Date | null;
    workLogUpdatedAt: Date | null;
    submittedAt: Date | null;
    logoutAt: Date | null;
    workingMinutes: number;
  } | null = null;

  let todayAcknowledgements: { taskId: string; status: "ON_TIME" | "LATE"; task: { title: string } }[] = [];

  if (user.role === "INTERN") {
    await recordLoginTime().catch(() => {});

    timeline = await prisma.dailyTimeline.findUnique({
      where: { studentId_date: { studentId: user.id, date: today } },
      select: {
        loginAt: true,
        workLogUpdatedAt: true,
        submittedAt: true,
        logoutAt: true,
        workingMinutes: true,
      },
    });

    todayAcknowledgements = await prisma.taskAcknowledgement.findMany({
      where: { studentId: user.id, date: today },
      select: { taskId: true, status: true, task: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        description={`Signed in as ${user.designation || user.role}${userDepartment ? ` in ${userDepartment.name}` : ""}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={user.role === "INTERN" ? "My Open Tasks" : "Active Tasks"}
          value={openTasks}
          icon={ListTodo}
        />
        <StatCard title="Events & Pipeline" value={projectsCount} icon={Compass} />
        <StatCard title="TTC Interns" value={studentsCount} icon={GraduationCap} />
        <StatCard title="Batches" value={batchesCount} icon={Layers} />
      </div>

      {hasDashboardAccess ? (
        isLead ? (
          <LeadDashboardView
            user={{ id: user.id, name: user.name, isSystemAdmin: user.isSystemAdmin }}
            projects={roleProjects}
            tasks={roleTasks}
            teamMembers={teamMembers}
            token={token}
            currentUser={user}
          />
        ) : (
          <MemberDashboardView
            user={{ id: user.id, name: user.name, isSystemAdmin: user.isSystemAdmin }}
            projects={roleProjects}
            tasks={roleTasks}
            token={token}
            currentUser={user}
          />
        )
      ) : (
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-slate-900/50 dark:via-background dark:to-indigo-950/20">
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <div className="relative mb-6">
              <div className="size-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg">
                <ShieldCheck className="size-8" />
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome to Your Workspace</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Hello, {user.name}. Your workspace is being configured by the administrator.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Student Daily Timeline */}
      {!!user.studentProfile && (
        <Card className="border-indigo-100 dark:border-indigo-900/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="size-4 text-indigo-500" />
                Today&apos;s Timeline
              </CardTitle>
              <EndWorkDayButton alreadyEnded={!!timeline?.logoutAt} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <LogIn className="size-4 shrink-0 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Login</p>
                  <p className="text-sm font-medium">{formatTime(timeline?.loginAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <FileText className="size-4 shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Work Log</p>
                  <p className="text-sm font-medium">{formatTime(timeline?.workLogUpdatedAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Report Submitted</p>
                  <p className="text-sm font-medium">{formatTime(timeline?.submittedAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <LogOut className="size-4 shrink-0 text-slate-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Logout</p>
                  <p className="text-sm font-medium">{formatTime(timeline?.logoutAt)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3">
              <Clock className="size-4 text-indigo-500" />
              <span className="text-sm text-muted-foreground">Hours Worked:</span>
              <span className="text-sm font-semibold">
                {formatMinutes(timeline?.workingMinutes ?? 0)}
              </span>
            </div>

            {todayAcknowledgements.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Task Acknowledgements Today
                  </p>
                  <div className="space-y-2">
                    {todayAcknowledgements.map((ack) => (
                      <div
                        key={ack.taskId}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span className="truncate text-sm">{ack.task.title}</span>
                        <Badge
                          variant="secondary"
                          className={
                            ack.status === "ON_TIME"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                          }
                        >
                          {ack.status === "ON_TIME" ? "On Time" : "Late"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
