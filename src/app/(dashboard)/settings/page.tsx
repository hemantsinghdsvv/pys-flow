import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, companyScope } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";

import { fetchPragyaAPI } from "@/lib/pragya-api";
import {
  PermissionsManagement,
  type RolePermissionRow,
  type DynamicRolePermissionRow,
  type UserOverrideRow,
  type UserItem,
} from "@/features/settings/components/permissions-management";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "settings:manage") && !can(user, "feature:permissions")) {
    redirect("/dashboard");
  }

  const scope = await companyScope(user);

  const [
    rolePermissions,
    userOverrides,
    dynamicRolePermissions,
    users,
  ] = await Promise.all([
    prisma.rolePermission.findMany(),
    prisma.userPermissionOverride.findMany(),
    prisma.dynamicRolePermission.findMany(),
    prisma.user.findMany({
      where: scope ? { companyId: scope } : {},
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        image: true,
        designation: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const rolePermRows: RolePermissionRow[] = rolePermissions.map((rp) => ({
    roleId: rp.roleId,
    permissionCode: rp.permissionCode,
    allowed: rp.allowed,
  }));

  const dynamicRolePermRows: DynamicRolePermissionRow[] = dynamicRolePermissions.map((rp) => ({
    roleId: rp.roleId,
    permissionCode: rp.permissionCode,
    allowed: rp.allowed,
  }));

  const userOverrideRows: UserOverrideRow[] = userOverrides.map((uo) => ({
    userId: uo.userId,
    permissionCode: uo.permissionCode,
    allowed: uo.allowed,
  }));

  let pragyaDepartments = [];
  try {
    const res = await fetchPragyaAPI("departments");
    if (res?.status) pragyaDepartments = res.data;
  } catch (error) {
    console.error("Failed to load pragya departments for permissions", error);
  }

  const userItems: UserItem[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId || "",
    image: u.image,
    designation: u.designation,
  }));

  const isSuperAdmin = user.isSystemAdmin === true;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Governance"
        description="Manage system permissions, roles, and automated triggers."
      />

      {isSuperAdmin && (
        <div className="mt-6">
          <PermissionsManagement
            initialRolePermissions={rolePermRows}
            initialDynamicRolePermissions={dynamicRolePermRows}
            initialUserOverrides={userOverrideRows}
            users={userItems}
            departments={pragyaDepartments}
          />
        </div>
      )}
    </div>
  );
}
