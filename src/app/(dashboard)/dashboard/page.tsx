import type { Metadata } from "next";
import type { Department, User } from "@prisma/client";
import Link from "next/link";
import {
  Building2,
  FolderKanban,
  GraduationCap,
  Layers,
  ListTodo,
  NotebookPen,
  LogIn,
  CheckCircle2,
  FileText,
  LogOut,
  Timer,
  Clock,
  KanbanSquare,
  ShieldCheck,
  Compass,
  CalendarDays,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EndWorkDayButton } from "@/features/workflow/end-work-day-button";
import { recordLoginTime } from "@/features/workflow/actions";
import { fetchPragyaAPI } from "@/lib/pragya-api";
import { cookies } from "next/headers";

// IMPORT THE NEW ROLE DASHBOARDS
import { AdminDashboardView, LeadDashboardView, MemberDashboardView } from "@/features/dashboard/components/role-views";

export const metadata: Metadata = { title: "Dashboard" };

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
  const hasCompaniesAccess = can(user, "feature:companies");
  const hasStudentsAccess = can(user, "feature:students");
  const hasProjectsAccess = can(user, "feature:projects");
  const hasBatchesAccess = can(user, "feature:batches");
  const hasTasksAccess = can(user, "feature:tasks") || can(user, "feature:kanban");
  const hasDailyLogsAccess = can(user, "feature:dailylogs");
  const hasKanbanAccess = can(user, "feature:kanban");
  const hasProposalsAccess = can(user, "feature:propose");
  const hasAnalyticsAccess = can(user, "feature:analytics");
  const hasCalendarAccess = can(user, "feature:calendar");
  const hasPermissionsAccess = can(user, "feature:permissions");

  const [companies, students, projects, batches, openTasks, reportsToday] =
    await Promise.all([
      hasCompaniesAccess ? prisma.company.count() : Promise.resolve(0),
      hasStudentsAccess ? prisma.user.count({ where: { isSystemAdmin: false, ...scope } }) : Promise.resolve(0),
      hasProjectsAccess ? prisma.project.count({ where: { ...scope } }) : Promise.resolve(0),
      hasBatchesAccess ? prisma.batch.count({ where: { ...scope } }) : Promise.resolve(0),
      hasTasksAccess
        ? prisma.task.count({
            where: {
              ...scope,
              status: { notIn: ["COMPLETED", "CANCELLED"] },
              ...(user.role === "INTERN" ? { assigneeId: user.id } : {}),
              OR: [
                { approval: null },
                { approval: { status: "APPROVED" } },
              ],
            },
          })
        : Promise.resolve(0),
      hasDailyLogsAccess
        ? prisma.dailyLog.count({
            where: {
              ...scope,
              date: today,
              ...(user.role === "INTERN" ? { studentId: user.id } : {}),
            },
          })
        : Promise.resolve(0),
    ]);

  // ROLE-BASED DASHBOARD DATA FETCHING (Realistic replacement of client HTML dummy data)
  // Evaluate real hierarchy level 
  const activeHierarchy = user.hierarchyLevel || 
    (user.isSystemAdmin === true ? 1 : user.role === "SENIOR" ? 2 : user.role === "EXECUTIVE" ? 3 : 4);

  const isAdmin = activeHierarchy === 1;
  const isLead = activeHierarchy === 2;
  // Fallback to member if not admin or lead (Level 3 or 4)

  let localDepartments: (Department & { _count: { tasks: number } })[] = [];
  let roleProjects: any[] = [];
  let roleTasks: any[] = [];
  let teamMembers: User[] = [];
  const token = (await cookies()).get('pragya_jwt')?.value;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  const userDepartment = dbUser?.departmentId 
    ? await prisma.department.findUnique({ where: { id: dbUser.departmentId } }) 
    : null;


  const defaultRoles = ["Tech Lead", "Finance Manager", "Event Manager", "Instructor", "Front Desk Lead"];
  const pragyaRoleNames = defaultRoles;

  // Give the logged in user a Pragya role based on their ID length or randomly
  const userPragyaRole = pragyaRoleNames[user.id.length % pragyaRoleNames.length];

  if (isAdmin) {
    roleTasks = await prisma.task.findMany({
      where: { ...scope },
      include: { assignee: true }
    });
    
    const depts = await prisma.department.findMany({
      where: scope as any
    });
    
    localDepartments = depts.map(d => ({
      ...d,
      _count: { tasks: roleTasks.filter(t => t.targetDepartmentId === d.id).length }
    }));
    
    roleProjects = await prisma.project.findMany({
      where: { ...scope },
      include: { tasks: true }
    });
  } else {
    // Strict non-admin visibility: My Tasks or Tasks I Assigned
    if (dbUser?.departmentId) {
      const members = await prisma.user.findMany({
        where: { departmentId: dbUser.departmentId, ...scope } as any
      });
      teamMembers = members.map((m: any, idx: number) => ({
        ...m,
        displayRole: pragyaRoleNames[idx % pragyaRoleNames.length]
      }));
    }

    roleTasks = await prisma.task.findMany({
      where: {
        ...scope,
        OR: [
          { assigneeId: user.id },
          { createdById: user.id }
        ]
      },
      include: { assignee: true }
    });
    
    const projectIds = Array.from(new Set(roleTasks.map(t => t.projectId).filter(Boolean))) as string[];
    roleProjects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      include: { tasks: true }
    });
  }


  // ── Student: auto-record login + fetch today's timeline ────────────────
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
        description={`You are signed in as ${userPragyaRole}${userDepartment ? ` in the ${userDepartment.name} department` : ""}.`}
      />

      {/* ── Stat Cards (Core Yoga School Operations) ──────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={user.role === "INTERN" ? "My Open Tasks" : "Active Tasks"}
          value={openTasks}
          icon={ListTodo}
        />
        <StatCard 
          title="Events & Pipeline" 
          value={projects} 
          icon={Compass} 
        />
        <StatCard 
          title="TTC Interns" 
          value={students} 
          icon={GraduationCap} 
        />
        <StatCard 
          title="Batches" 
          value={batches} 
          icon={Layers} 
        />
      </div>

      {/* ── 3 Core Modules Navigation ────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <KanbanSquare className="size-5 text-amber-500" />
              1. Tasks & Kanban
            </CardTitle>
            <CardDescription>
              Assign team tasks, track hours, set deadlines, and supervise task execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href="/tasks">Task List</Link>
            </Button>
            <Button size="sm" asChild className="flex-1 bg-[#00381F] hover:bg-[#0A4A2B] text-white">
              <Link href="/kanban">Kanban Board</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="size-5 text-sky-500" />
              2. Events & Workshops
            </CardTitle>
            <CardDescription>
              Pre-planning Kanban board, teacher event proposals, and Admin approvals.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" asChild className="w-full bg-[#00381F] hover:bg-[#0A4A2B] text-white justify-between">
              <Link href="/events">
                <span>Event Pre-planning</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-5 text-indigo-500" />
              3. Internships
            </CardTitle>
            <CardDescription>
              CEO batch task dispatcher, personalized intern assignments, and cohort progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" asChild className="w-full bg-[#00381F] hover:bg-[#0A4A2B] text-white justify-between">
              <Link href="/internship">
                <span>Internship Hub</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Role-Based Dashboard Views (Pragya Flow Concepts) ────────── */}
      {hasDashboardAccess ? (
        isAdmin ? (
          <AdminDashboardView 
            projects={roleProjects} 
            tasks={roleTasks} 
            token={token}
            currentUser={user}
          />
        ) : isLead ? (
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
              <div className="absolute inset-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30 blur-xl scale-150 animate-pulse" />
              <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-xl shadow-indigo-200 dark:shadow-none ring-4 ring-white dark:ring-slate-900">
                <ShieldCheck className="size-10" />
              </div>
            </div>
            
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome to Your Workspace
            </h2>
            
            <div className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
              <p className="mb-2">Hello, <span className="font-semibold text-slate-700 dark:text-slate-300">{user.name}</span>!</p>
              <p>Your workspace is currently being prepared. The administrator is configuring your role and access permissions.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button variant="outline" className="rounded-full shadow-sm" asChild>
                <Link href="/profile">View Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Student Daily Timeline Widget ────────────────────────────────── */}
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
                  <p className="text-xs text-muted-foreground">Work Log Updated</p>
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
