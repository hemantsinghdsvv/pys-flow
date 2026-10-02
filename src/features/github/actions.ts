"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import {
  repositorySchema,
  repoLinkSchema,
  type RepositoryValues,
  type RepoLinkValues,
} from "@/features/github/schemas";

/** Load a project and assert the caller may act on it. */
async function loadProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, companyId: true },
  });
  if (!project) throw new Error("Project not found.");
  return project;
}

export async function createRepository(values: RepositoryValues) {
  const user = await requireUser();
  if (!can(user, "project:update")) {
    throw new Error("You do not have permission to manage repositories.");
  }
  const data = repositorySchema.parse(values);
  const project = await loadProject(data.projectId);
  assertCompanyAccess(user, project.companyId);

  const repo = await prisma.repository.create({
    data: {
      projectId: project.id,
      name: data.name,
      url: data.url,
      defaultBranch: data.defaultBranch || "main",
      createdById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    companyId: project.companyId,
    action: "CREATE",
    entityType: "Repository",
    entityId: repo.id,
    entityName: repo.name,
  });

  revalidatePath(`/projects/${project.id}`);
  return { id: repo.id };
}

export async function deleteRepository(id: string) {
  const user = await requireUser();
  if (!can(user, "project:update")) {
    throw new Error("You do not have permission to manage repositories.");
  }
  const repo = await prisma.repository.findUnique({
    where: { id },
    include: { project: { select: { id: true, companyId: true } } },
  });
  if (!repo) throw new Error("Repository not found.");
  assertCompanyAccess(user, repo.project.companyId);

  await prisma.repository.update({ where: { id }, data: { deletedAt: new Date() } });

  await logActivity({
    userId: user.id,
    companyId: repo.project.companyId,
    action: "DELETE",
    entityType: "Repository",
    entityId: id,
    entityName: repo.name,
  });

  revalidatePath(`/projects/${repo.project.id}`);
}

export async function addRepoLink(values: RepoLinkValues) {
  const user = await requireUser();
  const data = repoLinkSchema.parse(values);

  const repo = await prisma.repository.findUnique({
    where: { id: data.repositoryId },
    include: { project: { select: { id: true, companyId: true } } },
  });
  if (!repo) throw new Error("Repository not found.");
  assertCompanyAccess(user, repo.project.companyId);

  const link = await prisma.repoLink.create({
    data: {
      repositoryId: repo.id,
      type: data.type,
      url: data.url,
      title: data.title || null,
      addedById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    companyId: repo.project.companyId,
    action: "CREATE",
    entityType: "RepoLink",
    entityId: link.id,
    entityName: data.title || data.type,
  });

  revalidatePath(`/projects/${repo.project.id}`);
  return { id: link.id };
}

export async function deleteRepoLink(id: string) {
  const user = await requireUser();
  const link = await prisma.repoLink.findUnique({
    where: { id },
    include: {
      repository: {
        include: { project: { select: { id: true, companyId: true } } },
      },
    },
  });
  if (!link) throw new Error("Link not found.");
  assertCompanyAccess(user, link.repository.project.companyId);
  // Contributors may remove their own links; managers may remove any.
  if (link.addedById !== user.id && !can(user, "project:update")) {
    throw new Error("You can only remove links you added.");
  }

  await prisma.repoLink.update({ where: { id }, data: { deletedAt: new Date() } });

  revalidatePath(`/projects/${link.repository.project.id}`);
}
