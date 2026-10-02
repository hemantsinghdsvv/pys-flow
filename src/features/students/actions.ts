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
import { storage } from "@/lib/storage";
import { provisionUser, generatePassword } from "@/features/users/create-user";
import { studentSchema } from "@/features/students/schemas";

function parsePayload(formData: FormData) {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new Error("Missing payload");
  return studentSchema.parse(JSON.parse(raw));
}

async function saveFile(
  formData: FormData,
  key: string,
  folder: string,
  imageOnly = false
) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (imageOnly && !file.type.startsWith("image/")) {
    throw new Error(`${key} must be an image`);
  }
  const stored = await storage.save(file, folder);
  return stored.url;
}

export async function createStudent(formData: FormData) {
  const user = await requirePermission("user:create");
  const data = parsePayload(formData);
  const companyId = await resolveCompanyForWrite(user, data.companyId);

  if (data.batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
    if (!batch || batch.companyId !== companyId) {
      throw new Error("Batch does not belong to this company.");
    }
  }

  const password = data.password || generatePassword();
  const photoUrl = await saveFile(formData, "photo", "students/photos", true);
  const resumeUrl = await saveFile(formData, "resume", "students/resumes");

  const student = await provisionUser({
    name: data.name,
    email: data.email,
    password,
    isSystemAdmin: false,
    companyId,
    phone: data.phone,
  });

  if (photoUrl) {
    await prisma.user.update({
      where: { id: student.id },
      data: { image: photoUrl },
    });
  }

  await prisma.studentProfile.create({
    data: {
      userId: student.id,
      companyId,
      batchId: data.batchId || null,
      rollNumber: data.rollNumber || null,
      department: data.department || null,
      resumeUrl,
      skills: data.skills,
      githubUrl: data.githubUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      portfolioUrl: data.portfolioUrl || null,
    },
  });

  await logActivity({
    userId: user.id,
    companyId,
    action: "CREATE",
    entityType: "Student",
    entityId: student.id,
    entityName: student.name,
  });

  revalidatePath("/students");
  redirect(`/students/${student.id}?created=1&password=${encodeURIComponent(password)}`);
}

export async function updateStudent(userId: string, formData: FormData) {
  const actor = await requirePermission("user:update");
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile) throw new Error("Student not found");
  assertCompanyAccess(actor, profile.companyId);

  const data = parsePayload(formData);
  const photoUrl = await saveFile(formData, "photo", "students/photos", true);
  const resumeUrl = await saveFile(formData, "resume", "students/resumes");

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone || null,
      ...(photoUrl ? { image: photoUrl } : {}),
    },
  });

  await prisma.studentProfile.update({
    where: { userId },
    data: {
      batchId: data.batchId || null,
      rollNumber: data.rollNumber || null,
      department: data.department || null,
      skills: data.skills,
      githubUrl: data.githubUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      portfolioUrl: data.portfolioUrl || null,
      ...(resumeUrl ? { resumeUrl } : {}),
    },
  });

  await logActivity({
    userId: actor.id,
    companyId: profile.companyId,
    action: "UPDATE",
    entityType: "Student",
    entityId: userId,
    entityName: data.name,
  });

  revalidatePath("/students");
  revalidatePath(`/students/${userId}`);
  redirect(`/students/${userId}`);
}

export async function setStudentActive(userId: string, isActive: boolean) {
  const actor = await requirePermission("user:update");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.isSystemAdmin) throw new Error("Student not found");
  assertCompanyAccess(actor, target.companyId);

  await prisma.user.update({ where: { id: userId }, data: { isActive } });

  await logActivity({
    userId: actor.id,
    companyId: target.companyId,
    action: "UPDATE",
    entityType: "Student",
    entityId: userId,
    entityName: target.name,
    details: { isActive },
  });

  revalidatePath(`/students/${userId}`);
  revalidatePath("/students");
}

/** Soft-delete a user. MANAGER only. */
export async function deleteUser(userId: string) {
  const actor = await requirePermission("user:delete");
  if (actor.role !== "MANAGER") {
    throw new Error("Only Super Admin can delete users.");
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found.");

  // Soft delete: mark deleted + deactivate
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  });

  // Invalidate all active sessions for this user
  await prisma.session.deleteMany({ where: { userId } });

  await logActivity({
    userId: actor.id,
    companyId: target.companyId,
    action: "DELETE",
    entityType: "User",
    entityId: userId,
    entityName: target.name,
  });

  revalidatePath("/students");
}

