import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { 
  GraduationCap, 
  Users, 
  Layers, 
  CheckCircle2, 
  Clock, 
  CalendarClock, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { requireUser, companyFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BatchAssignModal } from "@/features/internships/components/batch-assign-modal";
import { IndividualAssignModal } from "@/features/internships/components/individual-assign-modal";

export const metadata: Metadata = { title: "Internships & Teacher Training - Pragya Yog School" };

export default async function InternshipPage() {
  const user = await requireUser();
  const scope = await companyFilter(user);

  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;

  // Fetch batches with their interns
  const batches = await prisma.batch.findMany({
    where: {
      ...scope,
      deletedAt: null,
    },
    include: {
      students: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              assignedTasks: {
                where: { deletedAt: null },
                select: { id: true, status: true, estimatedHours: true },
              },
            },
          },
        },
      },
    },
    orderBy: { startDate: "desc" },
  });

  // Collect all interns
  const allInterns = batches.flatMap((b) =>
    b.students.map((s) => ({
      id: s.user.id,
      name: s.user.name,
      email: s.user.email,
      image: s.user.image,
      batchName: b.name,
      batchId: b.id,
      rollNumber: s.rollNumber,
      enrolledAt: s.enrolledAt,
      tasks: s.user.assignedTasks,
      totalTasks: s.user.assignedTasks.length,
      completedTasks: s.user.assignedTasks.filter((t) => t.status === "COMPLETED").length,
    }))
  );

  const totalInterns = allInterns.length;
  const totalTasksAssigned = allInterns.reduce((acc, curr) => acc + curr.totalTasks, 0);
  const totalCompleted = allInterns.reduce((acc, curr) => acc + curr.completedTasks, 0);
  const overallCompletionRate = totalTasksAssigned > 0 
    ? Math.round((totalCompleted / totalTasksAssigned) * 100) 
    : 0;

  // Intern-specific tasks if current user is an intern
  const myTasks = await prisma.task.findMany({
    where: {
      assigneeId: user.id,
      deletedAt: null,
    },
    include: {
      createdBy: { select: { name: true, designation: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const myTotalTasks = myTasks.length;
  const myCompleted = myTasks.filter((t) => t.status === "COMPLETED").length;
  const myInProgress = myTasks.filter((t) => t.status === "PENDING" || t.status === "REVIEW").length;
  const myRate = myTotalTasks > 0 ? Math.round((myCompleted / myTotalTasks) * 100) : 0;

  // Format batches for modal
  const batchesForModal = batches.map((b) => ({
    id: b.id,
    name: b.name,
    studentCount: b.students.length,
  }));

  // Format interns for modal
  const internsForModal = allInterns.map((i) => ({
    id: i.id,
    name: i.name,
    email: i.email,
    batchName: i.batchName,
  }));

  // ──────────────────────────── 1. INTERN DASHBOARD VIEW ────────────────────────────
  if (!isAdmin && user.role === "STUDENT") {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">🧘</span>
              <h1 className="text-2xl font-serif font-bold text-foreground">
                Welcome, {user.name}!
              </h1>
              <Badge className="bg-[#00381F] text-[#F5EFE5] text-xs font-semibold uppercase">
                Intern / TTC Student
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Track your practical training assignments, mentor feedback, and curriculum timeline.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              {myTotalTasks} Tasks Assigned
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Total Tasks</span>
            <div className="text-2xl font-bold font-serif text-foreground mt-1">{myTotalTasks}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-amber-600 uppercase">In Progress</span>
            <div className="text-2xl font-bold font-serif text-foreground mt-1">{myInProgress}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Completed</span>
            <div className="text-2xl font-bold font-serif text-foreground mt-1">{myCompleted}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase">Completion Rate</span>
            <div className="text-2xl font-bold font-serif text-foreground mt-1">{myRate}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">Curriculum & Task Progress</span>
            <span className="font-bold text-[#00381F] dark:text-[#D9AE29]">{myRate}% Completed</span>
          </div>
          <Progress value={myRate} className="h-2.5 bg-muted" />
        </div>

        {/* My Tasks List */}
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm font-serif text-foreground flex items-center gap-2">
              <CalendarClock className="size-4 text-[#00381F]" />
              My Assigned Tasks
            </h3>
            <Button asChild size="sm" variant="outline">
              <Link href="/kanban">View Kanban Board</Link>
            </Button>
          </div>

          <div className="divide-y divide-border">
            {myTasks.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No tasks currently assigned. Great job!
              </div>
            ) : (
              myTasks.map((t) => (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/tasks/${t.id}`} className="font-semibold text-sm hover:underline text-foreground">
                        {t.title}
                      </Link>
                      <Badge variant="outline" className="text-[10px]">
                        {t.priority}
                      </Badge>
                      {t.estimatedHours && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          ⏱️ {t.estimatedHours}h
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                    )}
                    <div className="text-[11px] text-muted-foreground">
                      Assigned by: <span className="font-medium text-foreground">{t.createdBy?.name || "School Director"}</span>
                      {t.deadline && ` · Deadline: ${format(new Date(t.deadline), "d MMM yyyy")}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={t.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {t.status}
                    </Badge>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/tasks/${t.id}`}>
                        Open <ArrowRight className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────── 2. ADMIN / CEO DASHBOARD VIEW ────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Yoga School Internships & Training"
        description="Teacher training cohorts, batch task dispatching, and individual intern supervision."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <IndividualAssignModal interns={internsForModal} />
            <BatchAssignModal batches={batchesForModal} />
          </div>
        }
      />

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Total Interns</span>
            <Users className="size-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{totalInterns}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled TTC students</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Active Batches</span>
            <Layers className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{batches.length}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Cohort groups</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Tasks Dispatched</span>
            <CalendarClock className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{totalTasksAssigned}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total assignments</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
            <span>Batch Completion</span>
            <TrendingUp className="size-4 text-[#D9AE29]" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{overallCompletionRate}%</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{totalCompleted} tasks completed</p>
        </div>
      </div>

      {/* ── Batches Overview ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm font-serif text-foreground flex items-center gap-2">
          <Layers className="size-4 text-[#00381F]" />
          Cohort Batches & Synchronization
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {batches.map((b) => (
            <div key={b.id} className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground">{b.name}</h4>
                <Badge variant="secondary" className="text-[10px]">
                  {b.students.length} Interns
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Term: {format(new Date(b.startDate), "MMM yyyy")} – {format(new Date(b.endDate), "MMM yyyy")}
              </p>
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-emerald-600">{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Interns Directory & Progress Table ── */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm font-serif text-foreground">
              Intern Directory & Performance
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supervise individual task delivery, completion status, and mentoring oversight.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Intern Name</th>
                <th className="px-4 py-3 text-left">Cohort Batch</th>
                <th className="px-4 py-3 text-left">Tasks (Done / Total)</th>
                <th className="px-4 py-3 text-left">Progress</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allInterns.map((intern) => {
                const pct = intern.totalTasks > 0 ? Math.round((intern.completedTasks / intern.totalTasks) * 100) : 0;

                return (
                  <tr key={intern.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{intern.name}</div>
                      <div className="text-xs text-muted-foreground">{intern.email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="text-xs">
                        {intern.batchName}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium">
                      {intern.completedTasks} / {intern.totalTasks} tasks
                    </td>
                    <td className="px-4 py-3.5 w-48">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs font-semibold text-muted-foreground w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                        <Link href={`/tasks?assignee=${intern.id}`}>
                          View Tasks
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
