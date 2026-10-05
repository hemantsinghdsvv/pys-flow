"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TeamRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  requireUser,
  resolveCompanyForWrite,
  assertCompanyAccess,
} from "@/lib/access";
import { can } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { storage } from "@/lib/storage";
import {
  projectSchema,
  milestoneSchema,
  teamSchema,
  type MilestoneValues,
  type TeamValues,
} from "@/features/projects/schemas";

function parsePayload(formData: FormData) {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new Error("Missing payload");
  return projectSchema.parse(JSON.parse(raw));
}

async function saveImage(formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Cover must be an image");
  const stored = await storage.save(file, "projects/covers");
  return stored.url;
}

async function getProjectOrThrow(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new Error("Project not found");
  return project;
}

function normalize(data: ReturnType<typeof projectSchema.parse>) {
  return {
    name: data.name,
    description: data.description || null,
    objective: data.objective || null,
    techStack: data.techStack,
    difficulty: data.difficulty,
    deliverables: data.deliverables || null,
    repositoryUrl: data.repositoryUrl || null,
    deploymentUrl: data.deploymentUrl || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    status: data.status,
    priority: data.priority,
    batchId: data.batchId || null,
  };
}

export type SimpleProjectInput = {
  name: string;
  description?: string;
  status?: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startDate?: string;
  endDate?: string;
  batchId?: string;
};

export async function createSimpleProject(input: SimpleProjectInput) {
  const user = await requireUser();
  if (
    !user.isSystemAdmin &&
    (user.hierarchyLevel == null || user.hierarchyLevel > 2) &&
    !can(user, "project:create")
  ) {
    throw new Error("You do not have permission to create projects.");
  }

  if (!input.name || !input.name.trim()) {
    throw new Error("Project name is required.");
  }

  const companyId = await resolveCompanyForWrite(user);

  const project = await prisma.project.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status || "ACTIVE",
      priority: input.priority || "MEDIUM",
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      batchId: input.batchId || null,
      companyId,
      createdById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    companyId,
    action: "CREATE",
    entityType: "Project",
    entityId: project.id,
    entityName: project.name,
  });

  revalidatePath("/projects");
  revalidatePath("/tasks");
  return { success: true, project };
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  if (
    !user.isSystemAdmin &&
    (user.hierarchyLevel == null || user.hierarchyLevel > 2) &&
    !can(user, "project:create")
  ) {
    throw new Error("You do not have permission to create projects.");
  }
  const data = parsePayload(formData);
  const companyId = await resolveCompanyForWrite(user, data.companyId);

  if (data.batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
    if (!batch || batch.companyId !== companyId) {
      throw new Error("Batch does not belong to this company.");
    }
  }

  const imageUrl = await saveImage(formData);
  const project = await prisma.project.create({
    data: {
      ...normalize(data),
      companyId,
      imageUrl,
      createdById: user.id,
    },
  });

  // A default repository entry when a repo URL is given.
  if (project.repositoryUrl) {
    await prisma.repository.create({
      data: {
        projectId: project.id,
        name: project.name,
        url: project.repositoryUrl,
        createdById: user.id,
      },
    });
  }

  await logActivity({
    userId: user.id,
    companyId,
    action: "CREATE",
    entityType: "Project",
    entityId: project.id,
    entityName: project.name,
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const user = await requirePermission("project:update");
  const existing = await getProjectOrThrow(id);
  assertCompanyAccess(user, existing.companyId);

  const data = parsePayload(formData);
  const imageUrl = await saveImage(formData);

  const project = await prisma.project.update({
    where: { id },
    data: { ...normalize(data), ...(imageUrl ? { imageUrl } : {}) },
  });

  await logActivity({
    userId: user.id,
    companyId: existing.companyId,
    action: "UPDATE",
    entityType: "Project",
    entityId: project.id,
    entityName: project.name,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  const user = await requirePermission("project:delete");
  const existing = await getProjectOrThrow(id);
  assertCompanyAccess(user, existing.companyId);

  const now = new Date();

  // Soft-delete all tasks belonging to this project
  await prisma.task.updateMany({
    where: { projectId: id, deletedAt: null },
    data: { deletedAt: now },
  });

  // Soft-delete the project itself
  await prisma.project.update({
    where: { id },
    data: { deletedAt: now },
  });

  await logActivity({
    userId: user.id,
    companyId: existing.companyId,
    action: "DELETE",
    entityType: "Project",
    entityId: id,
    entityName: existing.name,
    details: { note: "All associated tasks were also deleted." },
  });

  revalidatePath("/projects");
  revalidatePath("/kanban");
  revalidatePath("/tasks");
  redirect("/projects");
}


// ─────────────────────── assignment ───────────────────────

export async function assignMentors(projectId: string, userIds: string[]) {
  const user = await requirePermission("project:update");
  const project = await getProjectOrThrow(projectId);
  assertCompanyAccess(user, project.companyId);

  const valid = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      ...(project.companyId
        ? { OR: [{ companyId: project.companyId }, { companyId: null }] }
        : {}),
    },
    select: { id: true },
  });

  await prisma.projectMentor.createMany({
    data: valid.map((m) => ({ projectId, userId: m.id })),
    skipDuplicates: true,
  });

  await logActivity({
    userId: user.id,
    companyId: project.companyId,
    action: "ASSIGN",
    entityType: "Project",
    entityId: projectId,
    entityName: project.name,
    details: { mentorsAdded: valid.length },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function removeMentor(projectId: string, userId: string) {
  const user = await requirePermission("project:update");
  const project = await getProjectOrThrow(projectId);
  assertCompanyAccess(user, project.companyId);

  await prisma.projectMentor.deleteMany({ where: { projectId, userId } });
  revalidatePath(`/projects/${projectId}`);
}

export async function assignStudents(projectId: string, userIds: string[]) {
  const user = await requirePermission("project:update");
  const project = await getProjectOrThrow(projectId);
  assertCompanyAccess(user, project.companyId);

  const valid = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      ...(project.companyId
        ? { OR: [{ companyId: project.companyId }, { companyId: null }] }
        : {}),
    },
    select: { id: true },
  });

  await prisma.projectStudent.createMany({
    data: valid.map((s) => ({ projectId, userId: s.id })),
    skipDuplicates: true,
  });

  await logActivity({
    userId: user.id,
    companyId: project.companyId,
    action: "ASSIGN",
    entityType: "Project",
    entityId: projectId,
    entityName: project.name,
    details: { studentsAdded: valid.length },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function removeStudent(projectId: string, userId: string) {
  const user = await requirePermission("project:update");
  const project = await getProjectOrThrow(projectId);
  assertCompanyAccess(user, project.companyId);

  await prisma.projectStudent.deleteMany({ where: { projectId, userId } });
  revalidatePath(`/projects/${projectId}`);
}

// ─────────────────────── milestones ───────────────────────

export async function createMilestone(projectId: string, values: MilestoneValues) {
  const user = await requirePermission("project:update");
  const project = await getProjectOrThrow(projectId);
  assertCompanyAccess(user, project.companyId);

  const data = milestoneSchema.parse(values);
  const count = await prisma.milestone.count({ where: { projectId } });

  await prisma.milestone.create({
    data: {
      projectId,
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
      order: count,
      createdById: user.id,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateMilestone(
  milestoneId: string,
  values: MilestoneValues
) {
  const user = await requirePermission("project:update");
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });
  if (!milestone) throw new Error("Milestone not found");
  assertCompanyAccess(user, milestone.project.companyId);

  const data = milestoneSchema.parse(values);
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
    },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
}

export async function deleteMilestone(milestoneId: string) {
  const user = await requirePermission("project:update");
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });
  if (!milestone) throw new Error("Milestone not found");
  assertCompanyAccess(user, milestone.project.companyId);

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
}

// ─────────────────────── teams ───────────────────────

export async function createTeam(projectId: string, values: TeamValues) {
  const user = await requirePermission("team:manage");
  const project = await getProjectOrThrow(projectId);
  assertCompanyAccess(user, project.companyId);

  const data = teamSchema.parse(values);
  await prisma.team.create({
    data: {
      companyId: project.companyId,
      projectId,
      name: data.name,
      description: data.description || null,
      createdById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    companyId: project.companyId,
    action: "CREATE",
    entityType: "Team",
    entityName: data.name,
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteTeam(teamId: string) {
  const user = await requirePermission("team:manage");
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Team not found");
  assertCompanyAccess(user, team.companyId);

  await prisma.team.update({
    where: { id: teamId },
    data: { deletedAt: new Date() },
  });

  if (team.projectId) revalidatePath(`/projects/${team.projectId}`);
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: TeamRole,
  isLeader: boolean
) {
  const user = await requirePermission("team:manage");
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { project: true },
  });
  if (!team) throw new Error("Team not found");
  assertCompanyAccess(user, team.companyId);

  const member = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true },
  });
  if (!member) {
    throw new Error("User not found.");
  }

  // A member belongs to this company/studio if:
  // 1. Their companyId matches team.companyId
  // 2. Their companyId is null (global school member)
  // 3. Their studentProfile matches team.companyId
  // 4. They are already enrolled in this project
  const isDirectMatch =
    !team.companyId ||
    !member.companyId ||
    member.companyId === team.companyId ||
    member.studentProfile?.companyId === team.companyId;

  if (!isDirectMatch && team.projectId) {
    const isProjectMember = await prisma.projectStudent.findUnique({
      where: { projectId_userId: { projectId: team.projectId, userId } },
    });
    if (!isProjectMember) {
      throw new Error("User does not belong to this studio location or project.");
    }
  }

  // Ensure member is tied to the studio location if they didn't have one set
  if (!member.companyId && team.companyId) {
    await prisma.user.update({
      where: { id: userId },
      data: { companyId: team.companyId },
    });
  }

  if (isLeader) {
    await prisma.teamMember.updateMany({
      where: { teamId },
      data: { isLeader: false },
    });
  }

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId, role, isLeader },
    update: { role, isLeader },
  });

  if (team.projectId) revalidatePath(`/projects/${team.projectId}`);
}

export async function removeTeamMember(teamId: string, userId: string) {
  const user = await requirePermission("team:manage");
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Team not found");
  assertCompanyAccess(user, team.companyId);

  await prisma.teamMember.deleteMany({ where: { teamId, userId } });
  if (team.projectId) revalidatePath(`/projects/${team.projectId}`);
}
