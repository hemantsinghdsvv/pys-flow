"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";

export async function createOrgRole(values: {
  name: string;
  description?: string;
  hierarchyLevel?: number;
}) {
  const user = await requireUser();
  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;
  if (!isAdmin) {
    throw new Error("Only the School Director / Admin can define new organizational roles.");
  }

  const existing = await prisma.orgRole.findUnique({
    where: { name: values.name.trim() },
  });
  if (existing) {
    throw new Error("A role with this name already exists.");
  }

  const role = await prisma.orgRole.create({
    data: {
      name: values.name.trim(),
      description: values.description?.trim() || null,
      hierarchyLevel: values.hierarchyLevel ?? 3,
    },
  });

  revalidatePath("/team");
  revalidatePath("/settings");

  return { success: true, role };
}

export async function assignStaffRole(values: {
  userId: string;
  roleId: string;
  departmentId?: string;
  designation?: string;
}) {
  const user = await requireUser();
  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;
  if (!isAdmin) {
    throw new Error("Only the School Director / Admin can assign staff roles.");
  }

  const role = await prisma.orgRole.findUnique({
    where: { id: values.roleId },
  });
  if (!role) throw new Error("Role not found");

  await prisma.user.update({
    where: { id: values.userId },
    data: {
      roleId: values.roleId,
      hierarchyLevel: role.hierarchyLevel ?? 3,
      departmentId: values.departmentId || null,
      designation: values.designation?.trim() || role.name,
      isSystemAdmin: role.name.toLowerCase() === "admin" || role.hierarchyLevel === 1,
    },
  });

  revalidatePath("/team");
  revalidatePath("/settings");

  return { success: true };
}

export async function addTeamMember(values: {
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  departmentId?: string;
  designation?: string;
}) {
  const currentUser = await requireUser();
  const isAdmin = currentUser.hierarchyLevel === 1 || currentUser.isSystemAdmin === true;

  // Leads and admin can add their team members
  if (!isAdmin && currentUser.hierarchyLevel !== 2 && currentUser.hierarchyLevel !== 3) {
    throw new Error("You do not have permission to add team members.");
  }

  const role = await prisma.orgRole.findUnique({
    where: { id: values.roleId },
  });
  if (!role) throw new Error("Selected role not found.");

  // Non-admins cannot create Admin accounts or accounts with higher level
  if (!isAdmin) {
    if (role.hierarchyLevel === 1 || role.name.toLowerCase() === "admin") {
      throw new Error("Only the School Director / Admin can assign Admin privileges.");
    }
    if ((role.hierarchyLevel ?? 3) < (currentUser.hierarchyLevel ?? 3)) {
      throw new Error("You cannot add a team member with higher authority than yourself.");
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email: values.email.trim().toLowerCase() },
  });
  if (existing) {
    throw new Error(`A user with email ${values.email} already exists.`);
  }

  // If non-admin doesn't provide department, default to current user's department
  const departmentId = isAdmin ? values.departmentId || null : currentUser.departmentId || values.departmentId || null;

  const newUser = await prisma.user.create({
    data: {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone?.trim() || null,
      roleId: values.roleId,
      departmentId,
      designation: values.designation?.trim() || role.name,
      hierarchyLevel: role.hierarchyLevel ?? 3,
      isSystemAdmin: isAdmin && role.name.toLowerCase() === "admin",
    },
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");

  return { success: true, user: newUser };
}

export async function removeTeamMember(userId: string) {
  const currentUser = await requireUser();
  const isAdmin = currentUser.hierarchyLevel === 1 || currentUser.isSystemAdmin === true;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Staff member not found.");

  if (target.isSystemAdmin || target.email === "admin@example.com" || target.email === "admin@pragya.yoga") {
    throw new Error("The Director / Admin account cannot be removed.");
  }

  if (!isAdmin) {
    if ((target.hierarchyLevel ?? 4) <= (currentUser.hierarchyLevel ?? 4)) {
      throw new Error("You can only remove subordinate team members in your department.");
    }
    if (target.departmentId !== currentUser.departmentId) {
      throw new Error("You can only remove members within your own department.");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/team");
  revalidatePath("/dashboard");

  return { success: true };
}
