
import { can } from "@/lib/permissions";
import { NAV_GROUPS, type NavGroup } from "@/config/nav";

export function navForRole(userOrRole: string | { role: string; id?: string; activeRoleId?: string | null; roleId?: string | null; isSystemAdmin?: boolean }): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.permission) {
        return can(userOrRole, item.permission);
      }
      if (item.roles) {
        const role = typeof userOrRole === "string" ? userOrRole : userOrRole.role;
        return item.roles.includes(role);
      }
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}

export function getAllowedHrefs(userOrRole: string | { role: string; id?: string; activeRoleId?: string | null; roleId?: string | null; isSystemAdmin?: boolean }): string[] {
  const allowed: string[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.permission) {
        if (can(userOrRole, item.permission)) {
          allowed.push(item.href);
        }
      } else if (item.roles) {
        const role = typeof userOrRole === "string" ? userOrRole : userOrRole.role;
        if (item.roles.includes(role)) {
          allowed.push(item.href);
        }
      } else {
        allowed.push(item.href);
      }
    }
  }
  return allowed;
}
