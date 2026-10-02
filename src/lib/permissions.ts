import { prisma } from "@/lib/prisma";
import { cache } from "react";
import {
  type Permission,
  DEFAULT_ROLE_PERMISSIONS,
} from "./permission-constants";

export * from "./permission-constants";

// Global in-memory dynamic permissions store
let dynamicRoleCache = new Map<string, Set<Permission>>();
let dynamicUserOverridesCache = new Map<string, Map<Permission, boolean>>();


/**
 * Fast synchronous permission check (respects Super Admin, User Overrides, Dynamic Role Permissions, and Defaults).
 */
export function can(
  userOrRole: { role?: string; id?: string; isSystemAdmin?: boolean; roleId?: string | null; activeRoleId?: string | null } | undefined | null | string,
  permission: Permission,
): boolean {
  if (!userOrRole) return false;

  const role = typeof userOrRole === "string" ? userOrRole : userOrRole.role;
  const userId = typeof userOrRole === "object" ? userOrRole.id : undefined;
  const activeRoleId = typeof userOrRole === "object" && userOrRole.activeRoleId ? String(userOrRole.activeRoleId) : undefined;
  const roleId = typeof userOrRole === "object" ? userOrRole.roleId : undefined;
  const isSystemAdmin = typeof userOrRole === "object" ? userOrRole.isSystemAdmin : false;

  // System Admin always has permission
  if (isSystemAdmin) return true;

  // Super Admin legacy fallback is never restricted, EXCEPT when they switch to a sub-role.
  if (role === "MANAGER" && !activeRoleId) return true;

  // Check user-level override if provided
  if (userId && dynamicUserOverridesCache.has(userId)) {
    const userMap = dynamicUserOverridesCache.get(userId)!;
    if (userMap.has(permission)) {
      return userMap.get(permission)!;
    }
  }

  // -- True Sub-Role Dynamic Permissions --
  const effectiveRoleId = activeRoleId || roleId;
  if (effectiveRoleId) {
    if (dynamicRoleCache.has(effectiveRoleId)) {
      return dynamicRoleCache.get(effectiveRoleId)!.has(permission);
    }
  }

  // Base role fallback
  if (role && DEFAULT_ROLE_PERMISSIONS[role as string]) {
    return (DEFAULT_ROLE_PERMISSIONS[role as string] as Permission[]).includes(permission);
  }

  return false;
}

/**
 * Update active runtime cache from database rows.
 * Uses an atomic swap to prevent race conditions during concurrent request resolution.
 */
export function populatePermissionCache(
  rolePermissions: Array<{
    roleId: string;
    permissionCode: string;
    allowed: boolean;
  }>,
  userOverrides?: Array<{
    userId: string;
    permissionCode: string;
    allowed: boolean;
  }>
) {
  const newRoleCache = new Map<string, Set<Permission>>();
  const newUserOverridesCache = new Map<string, Map<Permission, boolean>>();

  // Apply DB overrides for roles
  for (const rp of rolePermissions) {
    const roleSet = newRoleCache.get(rp.roleId) ?? new Set();
    if (rp.allowed) {
      roleSet.add(rp.permissionCode as Permission);
    } else {
      roleSet.delete(rp.permissionCode as Permission);
    }
    newRoleCache.set(rp.roleId, roleSet);
  }

  // Apply user-level overrides
  if (userOverrides) {
    for (const uo of userOverrides) {
      if (!newUserOverridesCache.has(uo.userId)) {
        newUserOverridesCache.set(uo.userId, new Map());
      }
      newUserOverridesCache
        .get(uo.userId)!
        .set(uo.permissionCode as Permission, uo.allowed);
    }
  }

  // Atomic swap ensures no request ever reads an empty map
  dynamicRoleCache = newRoleCache;
  dynamicUserOverridesCache = newUserOverridesCache;
}

let lastPermissionsLoad = 0;
const PERMISSIONS_CACHE_TTL = 60000; // 60 seconds

export function invalidatePermissionCache() {
  lastPermissionsLoad = 0;
}

export async function ensurePermissionsLoaded() {
  const now = Date.now();
  if (now - lastPermissionsLoad < PERMISSIONS_CACHE_TTL && dynamicRoleCache.size > 0) {
    return;
  }

  try {
    const [rolePermissions, userOverrides] = await Promise.all([
      prisma.rolePermission.findMany(),
      prisma.userPermissionOverride.findMany(),
    ]);
    populatePermissionCache(rolePermissions, userOverrides);
    lastPermissionsLoad = Date.now();
  } catch (err) {
    console.error("Failed to load permissions from database:", err);
  }
}

