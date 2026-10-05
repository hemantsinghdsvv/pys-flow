import type { Metadata } from "next";
import Link from "next/link";
import {
  FolderGit2,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ListTodo,
  Layers,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { CreateBatchDialog } from "@/features/batches/components/create-batch-dialog";

export const metadata: Metadata = { title: "Projects & Initiatives - Pragya Yog School" };

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  ACTIVE: {
    label: "Active",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
  PLANNING: {
    label: "Planning",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
    dotClass: "bg-amber-500",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300",
    dotClass: "bg-blue-500",
  },
  ON_HOLD: {
    label: "On Hold",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300",
    dotClass: "bg-rose-500",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
    dotClass: "bg-slate-400",
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-slate-500" },
  MEDIUM: { label: "Medium", color: "text-amber-600" },
  HIGH: { label: "High", color: "text-orange-600 font-semibold" },
  URGENT: { label: "Urgent", color: "text-rose-600 font-bold" },
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status: statusFilter } = await searchParams;

  const canCreate =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "project:create");

  const scope = await companyFilter(user);

  const [projects, allProjects, studios, batches] = await Promise.all([
    prisma.project.findMany({
      where: {
        ...scope,
        deletedAt: null,
        ...(statusFilter && statusFilter !== "ALL" ? { status: statusFilter as any } : {}),
      },
      include: {
        company: { select: { id: true, name: true, themeColor: true } },
        batch: { select: { id: true, name: true } },
        tasks: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.project.findMany({
      where: { ...scope, deletedAt: null },
      select: { status: true },
    }),
    prisma.company.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.batch.findMany({
      where: { deletedAt: null, ...scope },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const totalCount = allProjects.length;
  const activeCount = allProjects.filter((p) => p.status === "ACTIVE").length;
  const planningCount = allProjects.filter((p) => p.status === "PLANNING").length;
  const completedCount = allProjects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects & Operational Initiatives"
        description="Dedicated command center for managing yoga school programs, retreats, teacher trainings, and seasonal curriculums."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-9 text-xs">
              <Link href="/batches">
                <Layers className="size-3.5 mr-1.5" />
                Batches & Cohorts
              </Link>
            </Button>
            {canCreate && (
              <CreateBatchDialog
                studios={studios}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-[#00381F]/30 text-[#00381F] dark:text-[#D9AE29] hover:bg-[#00381F]/5 gap-1.5 shadow-2xs font-medium"
                  >
                    <Plus className="size-3.5" />
                    <span>Create Batch</span>
                  </Button>
                }
              />
            )}
            {canCreate && (
              <CreateProjectModal
                batches={batches}
                studios={studios}
                trigger={
                  <Button
                    size="sm"
                    className="h-9 text-xs bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5 shadow-xs font-medium"
                  >
                    <Plus className="size-4" />
                    <span>New Project</span>
                  </Button>
                }
              />
            )}
          </div>
        }
      />

      {/* ── 1. KPI Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href="/projects"
          className="bg-card hover:bg-muted/40 transition-colors p-4 rounded-xl border border-border shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Initiatives
            </span>
            <div className="text-2xl font-bold font-serif text-foreground">
              {totalCount}
            </div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center justify-center text-[#00381F] dark:text-[#D9AE29]">
            <FolderGit2 className="size-5" />
          </div>
        </Link>

        <Link
          href="/projects?status=ACTIVE"
          className="bg-card hover:bg-muted/40 transition-colors p-4 rounded-xl border border-border shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Active / Running
            </span>
            <div className="text-2xl font-bold font-serif text-emerald-700 dark:text-emerald-400">
              {activeCount}
            </div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600">
            <Clock className="size-5" />
          </div>
        </Link>

        <Link
          href="/projects?status=PLANNING"
          className="bg-card hover:bg-muted/40 transition-colors p-4 rounded-xl border border-border shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              In Planning
            </span>
            <div className="text-2xl font-bold font-serif text-amber-700 dark:text-amber-400">
              {planningCount}
            </div>
          </div>
          <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-center text-amber-600">
            <Layers className="size-5" />
          </div>
        </Link>

        <Link
          href="/projects?status=COMPLETED"
          className="bg-card hover:bg-muted/40 transition-colors p-4 rounded-xl border border-border shadow-2xs flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Completed
            </span>
            <div className="text-2xl font-bold font-serif text-blue-700 dark:text-blue-400">
              {completedCount}
            </div>
          </div>
          <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-center text-blue-600">
            <CheckCircle2 className="size-5" />
          </div>
        </Link>
      </div>

      {/* ── 2. Filter Navigation & Add Quick Action ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-border/80 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { label: "All Projects", value: undefined },
            { label: "Active", value: "ACTIVE" },
            { label: "In Planning", value: "PLANNING" },
            { label: "Completed", value: "COMPLETED" },
            { label: "On Hold", value: "ON_HOLD" },
          ].map((tab) => {
            const isActive =
              tab.value === statusFilter ||
              (!tab.value && (!statusFilter || statusFilter === "ALL"));
            return (
              <Button
                key={tab.label}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                asChild
                className={`h-8 text-xs font-medium rounded-lg ${
                  isActive
                    ? "bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Link
                  href={
                    tab.value
                      ? `/projects?status=${tab.value}`
                      : "/projects"
                  }
                >
                  {tab.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <CreateBatchDialog
              studios={studios}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 border-dashed border-[#00381F]/40 hover:border-[#00381F] text-[#00381F] dark:text-[#D9AE29]"
                >
                  <Plus className="size-3.5" />
                  <span>New Batch</span>
                </Button>
              }
            />
          )}
          {canCreate && (
            <CreateProjectModal
              batches={batches}
              studios={studios}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 border-dashed border-[#00381F]/40 hover:border-[#00381F] text-[#00381F] dark:text-[#D9AE29]"
                >
                  <Plus className="size-3.5" />
                  <span>Quick Add</span>
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* ── 3. Projects Grid ── */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects found"
          description={
            statusFilter
              ? `There are no projects currently marked as ${statusFilter.toLowerCase()}.`
              : "No operational projects or programs are active yet. Create your first initiative to track milestones and assign staff tasks."
          }
          action={
            canCreate && (
              <CreateProjectModal
                batches={batches}
                studios={studios}
                trigger={
                  <Button size="sm" className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5">
                    <Plus className="size-4" />
                    Create First Project
                  </Button>
                }
              />
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const totalTasks = project.tasks.length;
            const completedTasks = project.tasks.filter((t) => t.status === "COMPLETED").length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const statusConfig = STATUS_CONFIG[project.status] || {
              label: project.status,
              badgeClass: "bg-slate-100 text-slate-700",
              dotClass: "bg-slate-400",
            };
            const priorityConfig = PRIORITY_CONFIG[project.priority] || {
              label: project.priority,
              color: "text-muted-foreground",
            };

            return (
              <Card
                key={project.id}
                className="group flex flex-col justify-between overflow-hidden border-border bg-card transition-all hover:shadow-md hover:border-[#00381F]/30 dark:hover:border-[#D9AE29]/40"
              >
                {/* Status Bar Indicator */}
                <div className={`h-1.5 w-full ${statusConfig.dotClass}`} />

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 font-medium ${statusConfig.badgeClass}`}
                      >
                        {statusConfig.label}
                      </Badge>
                      <span className={`text-[11px] font-medium ${priorityConfig.color}`}>
                        {priorityConfig.label} Priority
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-serif font-bold text-base text-foreground leading-snug hover:text-[#00381F] dark:hover:text-[#D9AE29] transition-colors block"
                      >
                        {project.name}
                      </Link>
                      {project.batch ? (
                        <Link
                          href={`/batches/${project.batch.id}`}
                          className="text-[11px] text-[#00381F] dark:text-[#D9AE29] font-medium flex items-center gap-1 mt-0.5 hover:underline"
                        >
                          <Layers className="size-3 text-[#00381F] dark:text-[#D9AE29]" />
                          Cohort: {project.batch.name}
                        </Link>
                      ) : (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Sparkles className="size-3 text-[#D9AE29]" />
                          Pragya Operational Initiative
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Progress & Timeline */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted-foreground font-medium">Execution Progress</span>
                        <span className="text-[11px] font-bold text-[#00381F] dark:text-[#D9AE29]">
                          {progress}% ({completedTasks}/{totalTasks} tasks)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#00381F] dark:bg-[#D9AE29] h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Timeline dates */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {project.startDate
                          ? format(new Date(project.startDate), "MMM d, yyyy")
                          : "Ongoing"}{" "}
                        —{" "}
                        {project.endDate
                          ? format(new Date(project.endDate), "MMM d, yyyy")
                          : "No deadline"}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Footer */}
                  <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-2">
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs flex-1">
                      <Link href={`/tasks?project=${project.id}`} className="gap-1">
                        <ListTodo className="size-3.5" />
                        <span>Tasks</span>
                      </Link>
                    </Button>

                    <Button
                      size="sm"
                      asChild
                      className="h-8 text-xs flex-1 bg-muted hover:bg-muted/80 text-foreground border border-border"
                    >
                      <Link href={`/projects/${project.id}`} className="gap-1">
                        <span>Details</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
