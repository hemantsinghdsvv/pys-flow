"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  requirePermission,
  resolveCompanyForWrite,
  assertCompanyAccess,
} from "@/lib/access";
import { can } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { batchSchema, type BatchValues } from "@/features/batches/schemas";

export type SimpleBatchInput = {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status?: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  companyId?: string;
  projectId?: string;
};

export async function createSimpleBatch(input: SimpleBatchInput) {
  const user = await requireUser();
  const canCreate =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "batch:create");

  if (!canCreate) {
    throw new Error("You do not have permission to create batches.");
  }

  if (!input.name || !input.name.trim()) {
    throw new Error("Batch name is required.");
  }
  if (!input.startDate) {
    throw new Error("Start date is required.");
  }
  if (!input.endDate) {
    throw new Error("End date is required.");
  }

  const companyId = await resolveCompanyForWrite(user, input.companyId);

  const batch = await prisma.batch.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: input.status || "ACTIVE",
      companyId,
      createdById: user.id,
    },
    include: {
      company: { select: { id: true, name: true } },
    },
  });

  // If a project ID was specified, automatically link this batch to that project
  if (input.projectId) {
    await prisma.project.update({
      where: { id: input.projectId },
      data: { batchId: batch.id },
    });
    revalidatePath(`/projects/${input.projectId}`);
  }

  await logActivity({
    userId: user.id,
    companyId,
    action: "CREATE",
    entityType: "Batch",
    entityId: batch.id,
    entityName: batch.name,
  });

  revalidatePath("/batches");
  revalidatePath("/projects");
  revalidatePath("/internship");

  return { success: true, batch };
}

export async function linkProjectToBatch(
  projectId: string,
  batchId: string | null
) {
  const user = await requireUser();
  const canManage =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "project:update");

  if (!canManage) {
    throw new Error("You do not have permission to modify project batches.");
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { batchId: batchId || null },
    include: {
      batch: { select: { id: true, name: true } },
    },
  });

  await logActivity({
    userId: user.id,
    companyId: project.companyId,
    action: "UPDATE",
    entityType: "Project",
    entityId: project.id,
    entityName: project.name,
    details: { batchId },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/batches");

  return { success: true, project };
}

export async function createBatch(values: BatchValues) {
  const user = await requirePermission("batch:create");
  const data = batchSchema.parse(values);
  const companyId = await resolveCompanyForWrite(user, data.companyId);

  const batch = await prisma.batch.create({
    data: {
      companyId,
      name: data.name,
      description: data.description || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status,
      createdById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    companyId,
    action: "CREATE",
    entityType: "Batch",
    entityId: batch.id,
    entityName: batch.name,
  });

  revalidatePath("/batches");
  redirect(`/batches/${batch.id}`);
}

export async function updateBatch(id: string, values: BatchValues) {
  const user = await requirePermission("batch:update");
  const existing = await prisma.batch.findUnique({ where: { id } });
  if (!existing) throw new Error("Batch not found");
  assertCompanyAccess(user, existing.companyId);

  const data = batchSchema.parse(values);
  const batch = await prisma.batch.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: data.status,
    },
  });

  await logActivity({
    userId: user.id,
    companyId: existing.companyId,
    action: "UPDATE",
    entityType: "Batch",
    entityId: batch.id,
    entityName: batch.name,
  });

  revalidatePath("/batches");
  revalidatePath(`/batches/${id}`);
  redirect(`/batches/${id}`);
}

export async function deleteBatch(id: string) {
  const user = await requirePermission("batch:delete");
  const existing = await prisma.batch.findUnique({ where: { id } });
  if (!existing) throw new Error("Batch not found");
  assertCompanyAccess(user, existing.companyId);

  await prisma.batch.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    companyId: existing.companyId,
    action: "DELETE",
    entityType: "Batch",
    entityId: id,
    entityName: existing.name,
  });

  revalidatePath("/batches");
  redirect("/batches");
}

/** Assign staff members / trainees (by user id or profile id) to a batch. */
export async function assignStudentsToBatch(
  batchId: string,
  ids: string[]
) {
  const user = await requireUser();
  const canManage =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "batch:update");

  if (!canManage) {
    throw new Error("You do not have permission to assign members to batches.");
  }

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Batch not found");
  assertCompanyAccess(user, batch.companyId);

  for (const id of ids) {
    // Check if the id is a User ID
    const dbUser = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true },
    });

    if (dbUser) {
      if (dbUser.studentProfile) {
        await prisma.studentProfile.update({
          where: { id: dbUser.studentProfile.id },
          data: { batchId },
        });
      } else {
        await prisma.studentProfile.create({
          data: {
            userId: dbUser.id,
            companyId: batch.companyId,
            batchId,
          },
        });
      }
    } else {
      // It's a StudentProfile ID directly
      await prisma.studentProfile.update({
        where: { id },
        data: { batchId },
      });
    }
  }

  await logActivity({
    userId: user.id,
    companyId: batch.companyId,
    action: "ASSIGN",
    entityType: "Batch",
    entityId: batchId,
    entityName: batch.name,
    details: { assigned: ids.length },
  });

  revalidatePath(`/batches/${batchId}`);
}

export async function removeStudentFromBatch(
  batchId: string,
  profileId: string
) {
  const user = await requireUser();
  const canManage =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "batch:update");

  if (!canManage) {
    throw new Error("You do not have permission to remove members from batches.");
  }

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Batch not found");
  assertCompanyAccess(user, batch.companyId);

  await prisma.studentProfile.updateMany({
    where: { id: profileId, batchId },
    data: { batchId: null },
  });

  revalidatePath(`/batches/${batchId}`);
}
