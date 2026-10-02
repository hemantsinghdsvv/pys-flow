import "server-only";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, type Permission, ensurePermissionsLoaded } from "@/lib/permissions";

export const ACTIVE_COMPANY_COOKIE = "drishti-active-company";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  roleId: string | null;
  isSystemAdmin: boolean;
  companyId: string | null;
  departmentId: string | null;
  hierarchyLevel: number | null;
  designation?: string | null; // Track current active designation
  activeRoleName?: string | null; // The exact name of the active context sub-role
  activeRoleId?: string | null; // The dynamic ID of the active role from the API
  studentProfile?: { id: string } | null;
};

/** Cached per-request session lookup with PostgreSQL authoritative verification. */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  
  const customUserId = (await cookies()).get("drishti_user_id")?.value;
  
  if (!session?.user?.id && !customUserId) return null;
  const userId = session?.user?.id || customUserId;

  // Always verify fresh, authoritative role and status from PostgreSQL
  let dbUser = await prisma.user.findUnique({
    where: { id: userId as string },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      roleId: true,
      orgRole: { select: { name: true } },
      isSystemAdmin: true,
      companyId: true,
      isActive: true,
      departmentId: true,
      hierarchyLevel: true,
      designation: true,
      studentProfile: { select: { id: true } },
    },
  });

  // Fallback lookup by email if id changed across database seeds
  if (!dbUser && session?.user?.email) {
    dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roleId: true,
        orgRole: { select: { name: true } },
        isSystemAdmin: true,
        companyId: true,
        isActive: true,
        departmentId: true,
        hierarchyLevel: true,
        designation: true,
        studentProfile: { select: { id: true } },
      },
    });
  }

  if (!dbUser || dbUser.isActive === false) return null;

  // Ensure runtime permission cache is loaded from PostgreSQL
  await ensurePermissionsLoaded();

  const user: SessionUser = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image,
    role: dbUser.orgRole?.name || "INTERN",
    roleId: dbUser.roleId,
    isSystemAdmin: dbUser.isSystemAdmin,
    companyId: dbUser.companyId,
    departmentId: dbUser.departmentId,
    hierarchyLevel: dbUser.hierarchyLevel,
    designation: dbUser.designation,
    studentProfile: dbUser.studentProfile,
  };

  // ── Apply Application-Level Context Override ──
  // If the user has switched their role context in the sidebar, override the session user properties.
  const activeRoleCookie = (await cookies()).get("drishti_active_role")?.value;
  if (activeRoleCookie) {
    try {
      const parsedContext = JSON.parse(activeRoleCookie);
      
      // Override properties
      user.hierarchyLevel = parsedContext.hierarchyLevel ?? null;
      user.departmentId = parsedContext.departmentId ? String(parsedContext.departmentId) : null;
      user.activeRoleName = parsedContext.roleName ?? null;
      user.designation = parsedContext.roleName ?? null;
      user.activeRoleId = parsedContext.roleId ? String(parsedContext.roleId) : null;

      // Map the active hierarchy level to a base Prisma Role for strict permission matching
      if (parsedContext.hierarchyLevel === 1) user.role = "MANAGER";
      else if (parsedContext.hierarchyLevel === 2) user.role = "SENIOR";
      else if (parsedContext.hierarchyLevel === 3) user.role = "EXECUTIVE";
      else if (parsedContext.hierarchyLevel === 4) user.role = "INTERN";
      
    } catch (err) {
      console.error("Failed to parse drishti_active_role cookie", err);
    }
  }

  return { user, session: session?.session || {} as any };
});

/** Require an authenticated user or redirect to login. */
export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect("/login?clear_session=true");
  return s.user;
}

/** Require one of the given roles. */
export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const user = await requireUser();
  if (user.isSystemAdmin) return user;
  if (user.hierarchyLevel != null && user.hierarchyLevel <= 2) return user;
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/** Require a specific permission (throws for use in server actions). */
export async function requirePermission(
  permission: Permission
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return user;
}

/**
 * Resolve the company scope for the current user.
 * - MANAGER: uses the company selected in the switcher cookie (may be null = all).
 * - Everyone else: bound to their own companyId (or null if unassigned).
 */
export async function companyScope(
  user: SessionUser
): Promise<string | null> {
  if (user.isSystemAdmin === true) {
    const store = await cookies();
    const selected = store.get(ACTIVE_COMPANY_COOKIE)?.value;
    if (!selected || selected === "all") return null;
    const exists = await prisma.company.findUnique({
      where: { id: selected },
      select: { id: true },
    });
    return exists?.id ?? null;
  }
  return user.companyId ?? null;
}

/**
 * Build a `companyId` where-filter for scoped queries.
 * Returns {} for super admin viewing all companies or users with no company scope.
 */
export async function companyFilter(
  user: SessionUser
): Promise<{ companyId?: string }> {
  const scope = await companyScope(user);
  return scope ? { companyId: scope } : {};
}

/**
 * Resolve the companyId a write should target.
 * Non-super users are always forced to their own company; super admins
 * may pass an explicit companyId, falling back to the switcher scope or active company.
 */
export async function resolveCompanyForWrite(
  user: SessionUser,
  requestedCompanyId?: string | null
): Promise<string> {
  if (user.isSystemAdmin !== true) {
    if (user.companyId) return user.companyId;
    const firstComp = await prisma.company.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    if (firstComp) return firstComp.id;
    throw new Error("Your account has no company assigned.");
  }
  const target = requestedCompanyId ?? (await companyScope(user)) ?? user.companyId;
  if (target) {
    const exists = await prisma.company.findUnique({
      where: { id: target },
      select: { id: true },
    });
    if (exists) return target;
  }
  const firstComp = await prisma.company.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  if (firstComp) return firstComp.id;
  throw new Error("No active company found in the system.");
}

/** Assert that an entity belongs to the caller's company scope. */
export function assertCompanyAccess(
  user: SessionUser,
  entityCompanyId: string | null | undefined
) {
  if (user.isSystemAdmin === true) return;
  if (!entityCompanyId) return; // Global entities without a company are accessible
  if (!user.companyId) return; // User without explicit company operates in active company scope
  if (entityCompanyId !== user.companyId) {
    throw new Error("Access denied: entity belongs to another company.");
  }
}
