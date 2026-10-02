import "server-only";
import { prisma } from "@/lib/prisma";
import { companyFilter, type SessionUser } from "@/lib/access";
import type { ProjectOptions } from "@/features/tasks/components/task-form";

/**
 * Load the projects (with their students, milestones and tasks) that populate
 * the task-form selects. Scoped to the caller's company; students only see
 * projects they are assigned to.
 */
export async function getProjectOptions(
  user: SessionUser
): Promise<ProjectOptions[]> {
  const scope = await companyFilter(user);

  const projects = await prisma.project.findMany({
    where: {
      ...scope,
      deletedAt: null,
      ...(user.role === "INTERN" && !user.isSystemAdmin
        ? { students: { some: { userId: user.id } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      students: {
        select: { user: { select: { id: true, name: true, isSystemAdmin: true, designation: true } } },
      },
      milestones: {
        where: { deletedAt: null },
        select: { id: true, title: true },
        orderBy: { order: "asc" },
      },
      tasks: {
        where: { deletedAt: null },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    students: p.students.map((s) => ({ id: s.user.id, name: s.user.name, role: s.user.isSystemAdmin ? "MANAGER" : "INTERN", designation: s.user.designation })),
    milestones: p.milestones,
    tasks: p.tasks,
  }));
}
