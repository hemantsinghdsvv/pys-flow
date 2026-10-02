"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  resolveCompanyForWrite,
  assertCompanyAccess,
} from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { batchSchema, type BatchValues } from "@/features/batches/schemas";

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

/** Assign students (by profile id) to a batch. */
export async function assignStudentsToBatch(
  batchId: string,
  profileIds: string[]
) {
  const user = await requirePermission("batch:update");
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Batch not found");
  assertCompanyAccess(user, batch.companyId);

  await prisma.studentProfile.updateMany({
    where: { id: { in: profileIds }, companyId: batch.companyId },
    data: { batchId },
  });

  await logActivity({
    userId: user.id,
    companyId: batch.companyId,
    action: "ASSIGN",
    entityType: "Batch",
    entityId: batchId,
    entityName: batch.name,
    details: { assigned: profileIds.length },
  });

  revalidatePath(`/batches/${batchId}`);
}

export async function removeStudentFromBatch(
  batchId: string,
  profileId: string
) {
  const user = await requirePermission("batch:update");
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("Batch not found");
  assertCompanyAccess(user, batch.companyId);

  await prisma.studentProfile.updateMany({
    where: { id: profileId, batchId },
    data: { batchId: null },
  });

  revalidatePath(`/batches/${batchId}`);
}
