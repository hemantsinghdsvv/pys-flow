import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { KanbanBoard, type KanbanTask } from "@/features/kanban/kanban-board";
import { ProjectFilter } from "@/features/kanban/project-filter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Event Track (Kanban)" };

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireUser();

  if (!can(user, "feature:kanban") && !can(user, "task:read")) {
    redirect("/dashboard");
  }

  const scope = await companyFilter(user);
  const { project: projectId } = await searchParams;

  const projects = await prisma.project.findMany({
    where: {
      ...scope,
      ...(user.role === "INTERN"
        ? { students: { some: { userId: user.id } } }
        : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;
  const isTeamLeadOrManager = user.hierarchyLevel != null && user.hierarchyLevel <= 2;

  const baseWhere: Prisma.TaskWhereInput = {
    parentId: null,
    deletedAt: null,
    ...(projectId ? { projectId } : {}),
    OR: [
      { approval: null },
      { approval: { status: { in: ["APPROVED", "DECLINED"] } } },
    ],
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
          OR: [
            { assigneeId: user.id },
            { createdById: user.id }
          ]
        } 
      ),
  };

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      approval: { select: { status: true } },
      assignee: {
        select: {
          id: true,
          name: true,
          image: true,
          designation: true,
        },
      },
      _count: { select: { subtasks: { where: { deletedAt: null } } } },
    },
    orderBy: { order: "asc" },
  });

  const mapToKanbanTask = (t: any): KanbanTask => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    order: t.order,
    estimatedHours: t.estimatedHours,
    deadline: t.deadline?.toISOString() ?? null,
    approvalStatus: t.approval?.status ?? null,
    projectName: t.project?.name ?? "General Task",
    projectId: t.project?.id ?? "",
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          name: t.assignee.name,
          image: t.assignee.image,
          role: t.assignee.role,
          designation: t.assignee.designation,
        }
      : null,
    subtaskCount: t._count.subtasks,
  });

  const allBoardTasks = tasks.map(mapToKanbanTask);
  const myBoardTasks = tasks.filter(t => t.assigneeId === user.id).map(mapToKanbanTask);
  const assignedBoardTasks = tasks.filter(t => t.createdById === user.id && t.assigneeId !== user.id).map(mapToKanbanTask);

  const canCreate = can(user, "task:create") || can(user, "task:assign");
  const canMove =
    can(user, "task:move") ||
    can(user, "task:status_change") ||
    can(user, "event_track:move_card");

  return (
    <>
      <PageHeader
        title="Event Track (Dynamic Kanban)"
        description="Real-time synchronized event & task sticky notes. Drag cards across workflow columns to update underlying state."
        actions={
          <>
            <ProjectFilter projects={projects} selected={projectId ?? ""} />
            {canCreate && (
              <Button asChild>
                <Link href="/tasks/new">
                  <Plus className="size-4" /> New task
                </Link>
              </Button>
            )}
          </>
        }
      />
      
      {isAdmin ? (
        <KanbanBoard
          key={projectId ?? "all"}
          initialTasks={allBoardTasks}
          canMove={canMove}
        />
      ) : (
        <div className="space-y-4">
          <Tabs defaultValue="my_tasks">
            <TabsList>
              <TabsTrigger value="my_tasks">My Tasks</TabsTrigger>
              <TabsTrigger value="assigned_tasks">Tasks I Assigned</TabsTrigger>
            </TabsList>
            <TabsContent value="my_tasks" className="mt-4 border-none p-0">
              <KanbanBoard
                key={`my_${projectId ?? "all"}`}
                initialTasks={myBoardTasks}
                canMove={canMove}
              />
            </TabsContent>
            <TabsContent value="assigned_tasks" className="mt-4 border-none p-0">
              <KanbanBoard
                key={`assigned_${projectId ?? "all"}`}
                initialTasks={assignedBoardTasks}
                canMove={canMove}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
}
