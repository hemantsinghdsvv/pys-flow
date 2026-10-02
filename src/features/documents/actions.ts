"use server";

import { revalidatePath } from "next/cache";
import type { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  requirePermission,
  resolveCompanyForWrite,
  assertCompanyAccess,
} from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { storage } from "@/lib/storage";
import { documentSchema } from "@/features/documents/schemas";

/**
 * Upload a document and attach it to a student and/or project.
 * The file is stored on UploadThing; we persist the CDN url in `filePath`
 * so it can be downloaded directly.
 */
export async function uploadDocument(formData: FormData) {
  const user = await requirePermission("document:manage");

  const parsed = documentSchema.parse({
    title: formData.get("title"),
    type: formData.get("type"),
    ownerId: formData.get("ownerId") ?? "",
    projectId: formData.get("projectId") ?? "",
  });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a file to upload.");
  }

  const companyId = await resolveCompanyForWrite(user);

  if (parsed.ownerId) {
    const owner = await prisma.user.findUnique({
      where: { id: parsed.ownerId },
      select: { companyId: true },
    });
    if (!owner) throw new Error("Selected student not found.");
    assertCompanyAccess(user, owner.companyId);
  }

  const stored = await storage.save(file, `documents/${companyId}`);

  const doc = await prisma.document.create({
    data: {
      companyId,
      ownerId: parsed.ownerId || null,
      projectId: parsed.projectId || null,
      type: parsed.type as DocumentType,
      title: parsed.title,
      filePath: stored.url,
      fileName: stored.fileName,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      issuedAt: new Date(),
      createdById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    companyId,
    action: "UPLOAD",
    entityType: "Document",
    entityId: doc.id,
    entityName: parsed.title,
  });

  revalidatePath("/documents");
  return { id: doc.id };
}

export async function deleteDocument(id: string) {
  const user = await requireUser();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("Document not found");
  assertCompanyAccess(user, doc.companyId);
  if (user.role === "INTERN" && doc.ownerId !== user.id) {
    throw new Error("You can only remove your own documents.");
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    companyId: doc.companyId,
    action: "DELETE",
    entityType: "Document",
    entityId: id,
    entityName: doc.title,
  });

  revalidatePath("/documents");
}
