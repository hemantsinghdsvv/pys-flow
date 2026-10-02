import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { TaskForm } from "@/features/tasks/components/task-form";
import { getProjectOptions } from "@/features/tasks/queries";
import type { TaskValues } from "@/features/tasks/schemas";

export const metadata: Metadata = { title: "Edit Task - Pragya Yog School" };

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "task:update")) redirect("/tasks");
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: { dependencies: { select: { dependsOnId: true } } },
  });
  if (!task) notFound();

  const isFullManager = user.isSystemAdmin === true || can(user, "task:assign");
  if (!isFullManager && task.createdById !== user.id && task.assigneeId !== user.id) {
    redirect("/tasks");
  }

  const projects = await getProjectOptions(user);
  const scope = await companyFilter(user);

  const rawUsers = await prisma.user.findMany({
    where: { 
      ...scope, 
      deletedAt: null, 
      isActive: true,
    },
    select: { 
      id: true, 
      name: true, 
      email: true,
      designation: true, 
      hierarchyLevel: true, 
      roleId: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      orgRole: { select: { id: true, name: true } },
    },
    orderBy: [
      { hierarchyLevel: "asc" },
      { name: "asc" },
    ],
  });

  const allUsers = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId,
    orgRoleName: u.orgRole?.name || null,
    designation: u.designation,
    hierarchyLevel: u.hierarchyLevel,
    departmentId: u.departmentId,
    departmentName: u.department?.name || null,
  }));

  const initial: TaskValues = {
    title: task.title,
    description: task.description ?? "",
    projectId: task.projectId ?? "",
    parentId: task.parentId ?? "",
    milestoneId: task.milestoneId ?? "",
    assigneeId: task.assigneeId ?? "",
    status: task.status,
    priority: task.priority,
    estimatedHours: task.estimatedHours,
    deadline: task.deadline?.toISOString().slice(0, 10) ?? "",
    dependencyIds: task.dependencies.map((d) => d.dependsOnId),
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Edit Task" description={task.title} />
      <TaskForm 
        projects={projects} 
        initial={initial} 
        taskId={task.id} 
        currentUser={{
          id: user.id,
          role: user.role,
          roleId: user.roleId,
          isSystemAdmin: user.isSystemAdmin,
          designation: user.designation,
          hierarchyLevel: user.hierarchyLevel,
          departmentId: user.departmentId,
        }}
        allUsers={allUsers}
      />
    </div>
  );
}
