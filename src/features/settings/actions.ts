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
import {
  sendEmail,
  isEmailConfigured,
  verifyEmailConnection,
} from "@/lib/email/mailer";
import {
  renderNotificationEmail,
  renderTemplatePreview,
  EMAIL_TEMPLATE_CATALOG,
  type TemplateInfo,
} from "@/lib/email/templates";
import type { NotificationType } from "@prisma/client";
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

// ─────────────────────────── Mail & Reminders Hub ───────────────────────────

const DEFAULT_REMINDERS = [
  {
    key: "login_reminder",
    label: "Morning Check-In Reminder",
    description: "Prompts staff and trainees at morning start (9:30 AM) to check in, acknowledge assignments, and review studio schedule.",
    defaultHour: 9,
    defaultMinute: 30,
  },
  {
    key: "worklog_reminder",
    label: "Midday Work Log Reminder",
    description: "Afternoon prompt (4:30 PM) reminding active members to log hours and update task progress.",
    defaultHour: 16,
    defaultMinute: 30,
  },
  {
    key: "submission_reminder",
    label: "End-of-Day Submission Reminder",
    description: "Notice dispatched during the 5:30 PM – 6:30 PM window to complete and submit daily accountability logs.",
    defaultHour: 17,
    defaultMinute: 30,
  },
  {
    key: "daily_reminder",
    label: "Daily Report Final Reminder",
    description: "Evening reminder (6:00 PM) sent to members who have not submitted their daily report before end of day.",
    defaultHour: 18,
    defaultMinute: 0,
  },
  {
    key: "task_reminder",
    label: "Task Progress Reminder",
    description: "Periodic reminder to keep ongoing tasks updated and log progress.",
    defaultHour: 10,
    defaultMinute: 0,
  },
  {
    key: "deadline_reminder",
    label: "Upcoming Deadline Alert",
    description: "High-priority notification sent when a task deadline is approaching within 24 hours.",
    defaultHour: 9,
    defaultMinute: 0,
  },
];

export type MailSettingsData = {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  companyName: string;
  smtp: {
    isConfigured: boolean;
    host: string;
    port: number;
    user: string;
    from: string;
    devOverride: string | null;
  };
  globalRemindersEnabled: boolean;
  reminders: Array<{
    key: string;
    label: string;
    description: string;
    hour: number;
    minute: number;
    enabled: boolean;
  }>;
  templates: Array<
    TemplateInfo & {
      hasOverride: boolean;
      customSubject: string | null;
      customBody: string | null;
      previewSubject: string;
      previewHtml: string;
    }
  >;
  recentNotifications: Array<{
    id: string;
    userName: string;
    userEmail: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
  }>;
  holidays: Array<{ id: string; name: string; date: string }>;
  departments: Array<{ id: string; name: string; extra: string | null }>;
  technologies: Array<{ id: string; name: string; extra: string | null }>;
};

/** Fetch complete mail, templates, and reminders configuration for the Settings page. */
export async function getMailSettingsData(): Promise<MailSettingsData> {
  const user = await requirePermission("settings:manage");
  const scope = await companyScope(user);

  // Authoritative current user & company lookup
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: { select: { id: true, name: true } },
    },
  });

  const currentUser = {
    id: user.id,
    name: dbUser?.name || user.name || "Administrator",
    email: dbUser?.email || user.email || "admin@pyshk.com",
    role: dbUser?.role || user.role,
  };
  const companyName = dbUser?.company?.name || "Pragya Yog School";

  // 1. SMTP info
  const smtp = {
    isConfigured: isEmailConfigured(),
    host: process.env.SMTP_HOST?.trim() || "Not configured",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER?.trim() || "Not configured",
    from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "Not configured",
    devOverride: process.env.DEV_EMAIL_OVERRIDE?.trim() || null,
  };

  // 2. Global Reminders state
  const globalSetting = await prisma.reminderSetting
    .findUnique({ where: { key: "global_automated_reminders" } })
    .catch(() => null);
  const envEnabled = process.env.ENABLE_EMAIL_REMINDERS?.trim().toLowerCase() === "true";
  const globalRemindersEnabled = globalSetting ? globalSetting.enabled : envEnabled;

  // 3. Reminders list
  const existingReminders = await prisma.reminderSetting.findMany().catch(() => []);
  const reminders = DEFAULT_REMINDERS.map((def) => {
    const match = existingReminders.find((r) => r.key === def.key);
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      hour: match ? match.hour : def.defaultHour,
      minute: match ? match.minute : def.defaultMinute,
      enabled: match ? match.enabled : false,
    };
  });

  // 4. Email Templates with overrides (personalized preview for active user)
  const overrides = await (prisma as any).emailTemplate.findMany().catch(() => []);
  const templates = EMAIL_TEMPLATE_CATALOG.map((item) => {
    const match = overrides.find((o: any) => o.key === item.key);
    const preview = renderTemplatePreview(
      item.type,
      match?.subject,
      match?.body,
      currentUser.name
    );
    return {
      ...item,
      hasOverride: Boolean(match),
      customSubject: match?.subject ?? null,
      customBody: match?.body ?? null,
      previewSubject: preview.subject,
      previewHtml: preview.html,
    };
  });

  // 5. Recent notifications
  const recentNotificationsRaw = await prisma.notification
    .findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    })
    .catch(() => []);

  const recentNotifications = recentNotificationsRaw.map((n) => ({
    id: n.id,
    userName: n.user?.name ?? "Unknown",
    userEmail: n.user?.email ?? "",
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  // 6. Holidays & Taxonomies
  const holidaysRaw = await prisma.holiday.findMany({
    where: scope ? { companyId: scope } : undefined,
    orderBy: { date: "asc" },
  });
  const holidays = holidaysRaw.map((h) => ({
    id: h.id,
    name: h.name,
    date: h.date.toISOString(),
  }));

  const departmentsRaw = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });
  const departments = departmentsRaw.map((d) => ({
    id: d.id,
    name: d.name,
    extra: d.code,
  }));

  const technologiesRaw = await prisma.technology.findMany({
    orderBy: { name: "asc" },
  });
  const technologies = technologiesRaw.map((t) => ({
    id: t.id,
    name: t.name,
    extra: t.category,
  }));

  return {
    currentUser,
    companyName,
    smtp,
    globalRemindersEnabled,
    reminders,
    templates,
    recentNotifications,
    holidays,
    departments,
    technologies,
  };
}

/** Verify SMTP connection. */
export async function verifySmtpConnectionAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  await requirePermission("settings:manage");
  return verifyEmailConnection();
}

/** Send a test email to the signed-in admin or custom recipient. */
export async function sendTestEmail(customTo?: string): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const user = await requirePermission("settings:manage");
  if (!isEmailConfigured()) {
    return { sent: false, reason: "SMTP is not configured in the environment (.env)." };
  }

  const to = customTo?.trim() || user.email;
  const { subject, html } = await renderNotificationEmail({
    type: "SYSTEM",
    title: "PYS Flow email is configured successfully 🎉",
    message:
      `This is a test verification message confirming your SMTP (Brevo) configuration is operational. Notifications from Pragya Yog School Operations Portal (PYS Flow) can now be delivered by email. Target recipient: ${to}`,
    link: "/settings",
    recipientName: user.name,
  });

  const { sent } = await sendEmail({ to, subject, html });
  return sent
    ? { sent: true }
    : { sent: false, reason: "The mail server rejected the message. Check credentials." };
}

/** Send a live sample of a specific template to verify in-inbox rendering. */
export async function sendTemplateSampleAction(
  type: NotificationType,
  customTo?: string
): Promise<{ sent: boolean; reason?: string }> {
  const user = await requirePermission("settings:manage");
  if (!isEmailConfigured()) {
    return { sent: false, reason: "SMTP is not configured in the environment (.env)." };
  }

  const to = customTo?.trim() || user.email;
  const preview = renderTemplatePreview(type, undefined, undefined, user.name);

  const { sent } = await sendEmail({
    to,
    subject: preview.subject,
    html: preview.html,
  });

  return sent
    ? { sent: true }
    : { sent: false, reason: "The mail server rejected the sample email. Verify credentials." };
}

/** Save custom subject and body override for an email template. */
export async function saveEmailTemplateOverrideAction({
  key,
  subject,
  body,
}: {
  key: string;
  subject: string;
  body: string;
}) {
  const user = await requirePermission("settings:manage");
  await (prisma as any).emailTemplate.upsert({
    where: { key },
    create: { key, subject: subject.trim(), body: body.trim() },
    update: { subject: subject.trim(), body: body.trim() },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "EmailTemplate",
    entityName: key,
  });
  revalidatePath("/settings");
  return { success: true };
}

/** Reset an email template back to the built-in PYS branded default. */
export async function resetEmailTemplateOverrideAction({ key }: { key: string }) {
  const user = await requirePermission("settings:manage");
  await (prisma as any).emailTemplate
    .delete({ where: { key } })
    .catch(() => null);

  await logActivity({
    userId: user.id,
    action: "DELETE",
    entityType: "EmailTemplate",
    entityName: key,
  });
  revalidatePath("/settings");
  return { success: true };
}

/** Toggle the global automated email reminders master switch. */
export async function toggleGlobalRemindersAction(enabled: boolean) {
  const user = await requirePermission("settings:manage");
  await prisma.reminderSetting.upsert({
    where: { key: "global_automated_reminders" },
    create: {
      key: "global_automated_reminders",
      hour: 0,
      minute: 0,
      enabled,
    },
    update: { enabled },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE",
    entityType: "ReminderSetting",
    entityName: "global_automated_reminders",
  });
  revalidatePath("/settings");
  return { success: true, enabled };
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
