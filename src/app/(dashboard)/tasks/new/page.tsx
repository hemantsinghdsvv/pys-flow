import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { TaskForm } from "@/features/tasks/components/task-form";
import { getProjectOptions } from "@/features/tasks/queries";

export const metadata: Metadata = { title: "New Task - Pragya Yog School" };

export default async function NewTaskPage() {
  const user = await requireUser();
  if (!can(user, "task:create") && !can(user, "task:assign")) {
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Create New Task"
        description="Assign operational and instructional tasks across school teams with timelines and priority."
      />
      <TaskForm 
        projects={projects} 
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
