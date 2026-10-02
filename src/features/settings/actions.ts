"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser, companyScope } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { broadcastTaskEvent } from "@/lib/realtime";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_DEFINITIONS,
  invalidatePermissionCache,
  can,
} from "@/lib/permissions";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";
import { renderNotificationEmail } from "@/lib/email/templates";
import {
  holidaySchema,
  departmentSchema,
  technologySchema,
  reminderSettingSchema,
  type HolidayValues,
  type DepartmentValues,
  type TechnologyValues,
  type ReminderSettingValues,
} from "@/features/settings/schemas";

// ─────────────────────────── Email ───────────────────────────

/** Send a test email to the signed-in admin to verify SMTP (Brevo) setup. */
export async function sendTestEmail(): Promise<{ sent: boolean; reason?: string }> {
  const user = await requirePermission("settings:manage");
  if (!isEmailConfigured()) {
    return { sent: false, reason: "SMTP is not configured in the environment." };
  }

  const { subject, html } = await renderNotificationEmail({
    type: "SYSTEM",
    title: "DRISHTI email is working 🎉",
    message:
      "This is a test message confirming your SMTP (Brevo) configuration is correct. Notifications and reminders will now be delivered by email.",
    link: "/settings",
    recipientName: user.name,
  });

  const { sent } = await sendEmail({ to: user.email, subject, html });
  return sent
    ? { sent: true }
    : { sent: false, reason: "The mail server rejected the message. Check credentials." };
}

// ─────────────────────────── Holidays ───────────────────────────

export async function addHoliday(values: HolidayValues) {
  const user = await requirePermission("settings:manage");
  const data = holidaySchema.parse(values);
  const scope = await companyScope(user);

  await prisma.holiday.create({
    data: {
      name: data.name,
      date: new Date(data.date),
      companyId: scope, // null for super-admin = global holiday
    },
  });

  await logActivity({
    userId: user.id,
    companyId: scope,
    action: "CREATE",
    entityType: "Holiday",
    entityName: data.name,
  });
  revalidatePath("/settings");
}

export async function deleteHoliday(id: string) {
  await requirePermission("settings:manage");
  await prisma.holiday.delete({ where: { id } });
  revalidatePath("/settings");
}

// ────────────────────────── Departments ──────────────────────────

export async function addDepartment(values: DepartmentValues) {
  const user = await requirePermission("settings:manage");
  const data = departmentSchema.parse(values);

  const existing = await prisma.department.findFirst({
    where: { name: data.name },
    select: { id: true },
  });
  if (existing) throw new Error("A department with that name already exists.");

  await prisma.department.create({
    data: { name: data.name, code: data.code || null },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Department",
    entityName: data.name,
  });
  revalidatePath("/settings");
}

export async function deleteDepartment(id: string) {
  await requirePermission("settings:manage");
  await prisma.department.delete({ where: { id } });
  revalidatePath("/settings");
}

// ────────────────────────── Technologies ──────────────────────────

export async function addTechnology(values: TechnologyValues) {
  const user = await requirePermission("settings:manage");
  const data = technologySchema.parse(values);

  const existing = await prisma.technology.findUnique({
    where: { name: data.name },
    select: { id: true },
  });
  if (existing) throw new Error("That technology already exists.");

  await prisma.technology.create({
    data: { name: data.name, category: data.category || null },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Technology",
    entityName: data.name,
  });
  revalidatePath("/settings");
}

export async function deleteTechnology(id: string) {
  await requirePermission("settings:manage");
  await prisma.technology.delete({ where: { id } });
  revalidatePath("/settings");
}

// ──────────────────────── Reminder settings ────────────────────────

export async function updateReminderSetting(values: ReminderSettingValues) {
  const user = await requirePermission("settings:manage");
  const data = reminderSettingSchema.parse(values);

  await prisma.reminderSetting.upsert({
    where: { key: data.key },
    create: {
      key: data.key,
      hour: data.hour,
      minute: data.minute,
      enabled: data.enabled,
    },
    update: { hour: data.hour, minute: data.minute, enabled: data.enabled },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "ReminderSetting",
    entityName: data.key,
  });
  revalidatePath("/settings");
}

// ──────────────────────── Roles & Permissions ────────────────────────

export async function updateRolePermission(
  roleId: string,
  permissionCode: string,
  allowed: boolean
) {
  const user = await requireUser();
  if (!user.isSystemAdmin && !can(user, "permissions:manage")) {
    throw new Error("Only Super Administrators can manage role permissions.");
  }

  // Ensure permission code is in SystemPermission table
  await prisma.systemPermission.upsert({
    where: { code: permissionCode },
    create: {
      code: permissionCode,
      category: "System",
      name: permissionCode,
    },
    update: {},
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionCode: {
        roleId,
        permissionCode,
      },
    },
    create: {
      roleId,
      permissionCode,
      allowed,
    },
    update: {
      allowed,
    },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "RolePermission",
    entityName: `${roleId}:${permissionCode} -> ${allowed ? "ALLOWED" : "DENIED"}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED", role: roleId });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function bulkUpdateRolePermissions(
  roleId: string,
  permissions: Record<string, boolean>
) {
  const user = await requireUser();
  if (!user.isSystemAdmin && !can(user, "permissions:manage")) {
    throw new Error("Only Super Administrators can manage role permissions.");
  }

  for (const [code, allowed] of Object.entries(permissions)) {
    await prisma.systemPermission.upsert({
      where: { code },
      create: { code, category: "System", name: code },
      update: {},
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionCode: {
          roleId,
          permissionCode: code,
        },
      },
      create: { roleId, permissionCode: code, allowed },
      update: { allowed },
    });
  }

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "RolePermission",
    entityName: `Bulk updated permissions for role: ${roleId}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED", role: roleId });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function resetRolePermissions(roleId: string) {
  const user = await requireUser();
  if (!user.isSystemAdmin && !can(user, "permissions:manage")) {
    throw new Error("Only Super Administrators can reset role permissions.");
  }

  // Delete custom overrides from database so default matrix applies
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  // Re-seed explicit default matrix
  const defaults = DEFAULT_ROLE_PERMISSIONS[roleId] ?? [];
  for (const code of PERMISSIONS) {
    const isAllowed = defaults.includes(code);
    await prisma.systemPermission.upsert({
      where: { code },
      create: { code, category: "System", name: code },
      update: {},
    });

    await prisma.rolePermission.create({
      data: {
        roleId,
        permissionCode: code,
        allowed: isAllowed,
      },
    });
  }

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "RolePermission",
    entityName: `Reset permissions to defaults for: ${roleId}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED", role: roleId });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function grantAllRolePermissions(roleId: string) {
  const user = await requireUser();
  if (!user.isSystemAdmin && !can(user, "permissions:manage")) {
    throw new Error("Only Super Administrators can grant permissions.");
  }

  for (const code of PERMISSIONS) {
    await prisma.systemPermission.upsert({
      where: { code },
      create: { code, category: "System", name: code },
      update: {},
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionCode: {
          roleId,
          permissionCode: code,
        },
      },
      create: { roleId, permissionCode: code, allowed: true },
      update: { allowed: true },
    });
  }

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "RolePermission",
    entityName: `Granted all permissions to role: ${roleId}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED", role: roleId });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateUserPermissionOverride(
  userId: string,
  permissionCode: string,
  allowed: boolean | null
) {
  const user = await requireUser();
  if (!user.isSystemAdmin && !can(user, "permissions:manage")) {
    throw new Error("Only Super Administrators can assign user-level permission overrides.");
  }

  if (allowed === null) {
    await prisma.userPermissionOverride.deleteMany({
      where: { userId, permissionCode },
    });
  } else {
    await prisma.systemPermission.upsert({
      where: { code: permissionCode },
      create: { code: permissionCode, category: "System", name: permissionCode },
      update: {},
    });

    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionCode: {
          userId,
          permissionCode,
        },
      },
      create: { userId, permissionCode, allowed },
      update: { allowed },
    });
  }

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "UserPermissionOverride",
    entityName: `User ${userId} -> ${permissionCode} override: ${allowed}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED", userId });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Reset ALL roles back to their default permission matrix.
 * Deletes every custom RolePermission DB override, then re-seeds the full
 * PERMISSION_DEFINITIONS × role matrix from DEFAULT_ROLE_PERMISSIONS.
 * Call this for a clean fresh-start from the Super Admin panel.
 */
export async function resetAllRolesPermissions() {
  const user = await requireUser();
  if (!user.isSystemAdmin) {
    throw new Error("Only Super Administrators can perform a full permission reset.");
  }

  // 1. Wipe every existing RolePermission row
  await prisma.rolePermission.deleteMany({});

  // 2. Ensure every permission code exists in SystemPermission
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.systemPermission.upsert({
      where: { code: def.code },
      create: {
        code: def.code,
        category: def.category,
        name: def.name,
        description: (def as { description?: string }).description ?? null,
      },
      update: {},
    });
  }

  // 3. Re-seed every role with explicit true/false rows from default matrix
  const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS) as (keyof typeof DEFAULT_ROLE_PERMISSIONS)[];
  for (const role of roles) {
    if (role === "MANAGER") continue; // Super Admin always has all permissions by logic
    const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    for (const def of PERMISSION_DEFINITIONS) {
      await prisma.rolePermission.create({
        data: {
          roleId: role, // assuming we map role name to a default roleId in seeding
          permissionCode: def.code,
          allowed: defaults.includes(def.code),
        },
      });
    }
  }

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "RolePermission",
    entityName: "Full system permission reset to defaults for all roles",
  });

  invalidatePermissionCache();
  // Broadcast with no role so ALL connected clients get refreshed
  broadcastTaskEvent({ type: "PERMISSION_CHANGED" });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

// ──────────────────────── True Sub-Role Dynamic Permissions ────────────────────────

export async function updateDynamicRolePermission(
  roleId: string,
  permissionCode: string,
  allowed: boolean
) {
  const user = await requireUser();
  if (user.isSystemAdmin !== true && !can(user, "permissions:manage")) {
    throw new Error("Only Super Administrators can manage dynamic role permissions.");
  }

  // Ensure permission code is in SystemPermission table
  await prisma.systemPermission.upsert({
    where: { code: permissionCode },
    create: {
      code: permissionCode,
      category: "System",
      name: permissionCode,
    },
    update: {},
  });

  await prisma.dynamicRolePermission.upsert({
    where: {
      roleId_permissionCode: {
        roleId,
        permissionCode,
      },
    },
    create: {
      roleId,
      permissionCode,
      allowed,
    },
    update: {
      allowed,
    },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "DynamicRolePermission",
    entityName: `RoleID ${roleId}:${permissionCode} -> ${allowed ? "ALLOWED" : "DENIED"}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED" });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function resetDynamicRolePermissions(roleId: string) {
  const user = await requireUser();
  if (!user || user.isSystemAdmin !== true) {
    throw new Error("Unauthorized. Only SUPER ADMIN (MANAGER) can modify permissions.");
  }

  await prisma.dynamicRolePermission.deleteMany({
    where: { roleId },
  });
  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "DynamicRolePermission",
    entityName: `Reset dynamic permissions to defaults for RoleID: ${roleId}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED" });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function grantAllDynamicRolePermissions(roleId: string) {
  const user = await requireUser();
  if (user.isSystemAdmin !== true && !can(user, "permissions:manage")) {
    throw new Error("Only Super Administrators can grant permissions.");
  }

  for (const code of PERMISSIONS) {
    await prisma.systemPermission.upsert({
      where: { code },
      create: { code, category: "System", name: code },
      update: {},
    });

    await prisma.dynamicRolePermission.upsert({
      where: {
        roleId_permissionCode: {
          roleId,
          permissionCode: code,
        },
      },
      create: { roleId, permissionCode: code, allowed: true },
      update: { allowed: true },
    });
  }

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "DynamicRolePermission",
    entityName: `Granted all permissions to RoleID: ${roleId}`,
  });

  invalidatePermissionCache();
  broadcastTaskEvent({ type: "PERMISSION_CHANGED" });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/kanban");
  revalidatePath("/dashboard");
  return { success: true };
}
