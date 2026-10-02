import type { Metadata } from "next";
import Link from "next/link";
import { Plus, LayoutGrid, FolderGit2 } from "lucide-react";
import type { Prisma, TaskStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { TASK_STATUSES } from "@/features/tasks/schemas";
import { TasksStatsCards } from "@/features/tasks/components/tasks-stats-cards";
import {
  TasksListView,
  type TaskListItem,
} from "@/features/tasks/components/tasks-list-view";

export const metadata: Metadata = { title: "Tasks Operations - Pragya Yog School" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; status?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "feature:tasks") && !can(user, "task:read")) {
    redirect("/dashboard");
  }

  const { project: projectId, status } = await searchParams;

  const isPendingFilter = status === "pending_approval";
  const statusFilter = TASK_STATUSES.includes(status as TaskStatus)
    ? (status as TaskStatus)
    : undefined;

  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;
  const isTeamLeadOrManager = user.hierarchyLevel != null && user.hierarchyLevel <= 2;

  const baseWhere: Prisma.TaskWhereInput = {
    deletedAt: null,
    ...(projectId ? { projectId } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(isPendingFilter
      ? { approval: { status: "PENDING" } }
      : {
          OR: [{ approval: null }, { approval: { status: "APPROVED" } }],
        }),
  };

  const where: Prisma.TaskWhereInput = {
    ...baseWhere,
    ...(isAdmin
      ? {}
      : isTeamLeadOrManager && user.departmentId
      ? {
          OR: [
            { assigneeId: user.id },
            { createdById: user.id },
            { assignee: { departmentId: user.departmentId } },
          ],
        }
      : {
          OR: [{ assigneeId: user.id }, { createdById: user.id }],
        }),
  };

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      assignee: {
        select: { id: true, name: true, image: true, designation: true },
      },
    },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  // Compute stats according to pragya flow.html reference
  const now = new Date();
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "PENDING").length;
  const inProgress = tasks.filter((t) => t.status === "REVIEW").length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const overdue = tasks.filter((t) => {
    if (!t.deadline || t.status === "COMPLETED" || t.status === "CANCELLED") {
      return false;
    }
    return new Date(t.deadline) < now;
  }).length;

  const taskItems: TaskListItem[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    projectName: t.project?.name ?? "General Operations",
    status: t.status,
    priority: t.priority,
    assigneeName: t.assignee?.name ?? null,
    assigneeImage: t.assignee?.image ?? null,
    assigneeDesignation: t.assignee?.designation ?? null,
    deadline: t.deadline?.toISOString() ?? null,
    estimatedHours: t.estimatedHours,
  }));

  const canCreate = can(user, "task:create") || can(user, "task:assign");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks Operations Dashboard"
        description="Comprehensive daily task management, status distribution, and execution roster across school teams."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-9 text-xs">
              <Link href="/projects">
                <FolderGit2 className="size-3.5 mr-1.5 text-[#00381F] dark:text-[#D9AE29]" />
                Projects
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-9 text-xs">
              <Link href="/kanban">
                <LayoutGrid className="size-3.5 mr-1.5" />
                Kanban Board
              </Link>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                asChild
                className="h-9 text-xs bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5]"
              >
                <Link href="/tasks/new">
                  <Plus className="size-3.5 mr-1.5" />
                  New Task
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* ── 1. Dashboard Stats in Task Section (Total, Pending, Overdue, Completed, In Progress) ── */}
      <TasksStatsCards
        total={total}
        pending={pending}
        inProgress={inProgress}
        overdue={overdue}
        completed={completed}
      />

      {/* ── 2. Task List ── */}
      <TasksListView tasks={taskItems} />
    </div>
  );
}
