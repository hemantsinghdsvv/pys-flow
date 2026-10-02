"use client";

import { useState, useMemo, useTransition } from "react";
import {
  RotateCcw,
  CheckCheck,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

import {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/permission-constants";
import {
  updateRolePermission,
  resetRolePermissions,
  grantAllRolePermissions,
  updateUserPermissionOverride,
  resetAllRolesPermissions,
  updateDynamicRolePermission,
  resetDynamicRolePermissions,
  grantAllDynamicRolePermissions,
} from "@/features/settings/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/shared/user-avatar";

export type RolePermissionRow = {
  roleId: string;
  permissionCode: string;
  allowed: boolean;
};

export type DynamicRolePermissionRow = {
  roleId: string;
  permissionCode: string;
  allowed: boolean;
};

export type UserOverrideRow = {
  userId: string;
  permissionCode: string;
  allowed: boolean;
};

export type UserItem = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  image: string | null;
  designation?: string | null;
};

const LEVELS = [
  { level: 1, name: 'Head / Manager', roleId: "MANAGER" },
  { level: 2, name: 'Lead / Senior', roleId: "SENIOR" },
  { level: 3, name: 'Staff / Executive', roleId: "INTERN" },
  { level: 4, name: 'Sub-role / Intern', roleId: "INTERN" }
];

const CATEGORIES = [
  "All Categories",
  "Feature Access",
  "Task Controls",
  "Event Track Controls",
  "Proposals & Events",
  "Analytics Controls",
  "Daily Workflow",
  "Administration",
];

export function PermissionsManagement({
  initialRolePermissions,
  initialDynamicRolePermissions = [],
  initialUserOverrides,
  users,
  departments = [],
}: {
  initialRolePermissions: RolePermissionRow[];
  initialDynamicRolePermissions?: DynamicRolePermissionRow[];
  initialUserOverrides: UserOverrideRow[];
  users: UserItem[];
  departments?: any[];
}) {
  const [selectedRole, setSelectedRole] = useState<string>("MANAGER");
  const [selectedApiRole, setSelectedApiRole] = useState<{id: string, name: string, description: string, baseRole: string} | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({1: true, 2: true, 3: true, 4: true});

  // Local state for instant reactive UI
  const [rolePermissionsState, setRolePermissionsState] = useState<RolePermissionRow[]>(
    initialRolePermissions
  );
  const [dynamicRolePermissionsState, setDynamicRolePermissionsState] = useState<DynamicRolePermissionRow[]>(
    initialDynamicRolePermissions
  );
  const [userOverridesState, setUserOverridesState] = useState<UserOverrideRow[]>(
    initialUserOverrides
  );

  // Map helper for active role's effective permissions
  const activeRolePermissionsMap = useMemo(() => {
    const map = new Map<string, boolean>();

    if (!selectedApiRole) {
      // Base Role behavior (for Super Admin only, as others shouldn't be selectable anymore)
      const defaults = DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? [];
      for (const p of PERMISSION_DEFINITIONS) {
        map.set(p.code, selectedRole === "MANAGER" ? true : defaults.includes(p.code));
      }
      for (const row of rolePermissionsState) {
        if (row.roleId === selectedRole) {
          map.set(row.permissionCode, selectedRole === "MANAGER" ? true : row.allowed);
        }
      }
    } else {
      // ── STRICT SUB-ROLE MODE ──
      // Sub-roles start with ZERO permissions (default deny)
      // Only explicitly granted dynamic permissions are allowed.
      for (const p of PERMISSION_DEFINITIONS) {
        map.set(p.code, false);
      }
      
      // Apply Dynamic DB values for specific sub-role
      for (const row of dynamicRolePermissionsState) {
        if (row.roleId === selectedApiRole.id) {
          map.set(row.permissionCode, row.allowed);
        }
      }
    }

    return map;
  }, [selectedRole, selectedApiRole, rolePermissionsState, dynamicRolePermissionsState]);

  // Filtered permission definitions
  const filteredPermissions = useMemo(() => {
    return PERMISSION_DEFINITIONS.filter((def) => {
      if (selectedCategory !== "All Categories" && def.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          def.name.toLowerCase().includes(q) ||
          def.code.toLowerCase().includes(q) ||
          (def.description && def.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Active selected user for overrides tab
  const activeUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  const activeUserOverridesMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const o of userOverridesState) {
      if (o.userId === selectedUserId) {
        map.set(o.permissionCode, o.allowed);
      }
    }
    return map;
  }, [userOverridesState, selectedUserId]);

  // Handle single permission toggle
  function handleTogglePermission(code: string, currentAllowed: boolean) {
    if (selectedRole === "MANAGER" && !selectedApiRole) {
      toast.info("Super Admin Base Role has all permissions unconditionally by design.");
      return;
    }

    const newAllowed = !currentAllowed;

    if (selectedApiRole) {
      // Optimistic local update for Dynamic Sub-Role
      setDynamicRolePermissionsState((prev) => {
        const existingIdx = prev.findIndex(
          (r) => r.roleId === selectedApiRole.id && r.permissionCode === code
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], allowed: newAllowed };
          return updated;
        }
        return [...prev, { roleId: selectedApiRole.id, permissionCode: code, allowed: newAllowed }];
      });

      startTransition(async () => {
        try {
          await updateDynamicRolePermission(selectedApiRole.id, code, newAllowed);
          toast.success(`Updated ${code} for ${selectedApiRole.name}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update dynamic permission");
        }
      });
    } else {
      // Optimistic local update for Base Role
      setRolePermissionsState((prev) => {
        const existingIdx = prev.findIndex(
          (r) => r.roleId === selectedRole && r.permissionCode === code
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], allowed: newAllowed };
          return updated;
        }
        return [...prev, { roleId: selectedRole, permissionCode: code, allowed: newAllowed }];
      });

      startTransition(async () => {
        try {
          await updateRolePermission(selectedRole, code, newAllowed);
          toast.success(`Updated base ${code} for ${selectedRole}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to update permission");
        }
      });
    }
  }

  // Handle reset to default matrix
  function handleResetDefaults() {
    if (selectedRole === "MANAGER" && !selectedApiRole) return;

    if (selectedApiRole) {
      startTransition(async () => {
        try {
          await resetDynamicRolePermissions(selectedApiRole.id);
          const defaults = DEFAULT_ROLE_PERMISSIONS[selectedApiRole.baseRole] ?? [];
          setDynamicRolePermissionsState((prev) =>
            prev
              .filter((r) => r.roleId !== selectedApiRole.id)
              .concat(
                PERMISSION_DEFINITIONS.map((def) => ({
                  roleId: selectedApiRole.id,
                  permissionCode: def.code,
                  allowed: defaults.includes(def.code),
                }))
              )
          );
          toast.success(`Reset ${selectedApiRole.name} permissions to defaults`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to reset dynamic permissions");
        }
      });
    } else {
      startTransition(async () => {
        try {
          await resetRolePermissions(selectedRole);
          const defaults = DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? [];
          setRolePermissionsState((prev) =>
            prev
              .filter((r) => r.roleId !== selectedRole)
              .concat(
                PERMISSION_DEFINITIONS.map((def) => ({
                  roleId: selectedRole,
                  permissionCode: def.code,
                  allowed: defaults.includes(def.code),
                }))
              )
          );
          toast.success(`Reset base ${selectedRole} permissions to defaults`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to reset base permissions");
        }
      });
    }
  }

  // Handle grant all
  function handleGrantAll() {
    if (selectedRole === "MANAGER" && !selectedApiRole) return;

    if (selectedApiRole) {
      startTransition(async () => {
        try {
          await grantAllDynamicRolePermissions(selectedApiRole.id);
          setDynamicRolePermissionsState((prev) =>
            prev
              .filter((r) => r.roleId !== selectedApiRole.id)
              .concat(
                PERMISSION_DEFINITIONS.map((def) => ({
                  roleId: selectedApiRole.id,
                  permissionCode: def.code,
                  allowed: true,
                }))
              )
          );
          toast.success(`Granted all permissions to ${selectedApiRole.name}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to grant permissions");
        }
      });
    } else {
      startTransition(async () => {
        try {
          await grantAllRolePermissions(selectedRole);
          setRolePermissionsState((prev) =>
            prev
              .filter((r) => r.roleId !== selectedRole)
              .concat(
                PERMISSION_DEFINITIONS.map((def) => ({
                  roleId: selectedRole,
                  permissionCode: def.code,
                  allowed: true,
                }))
              )
          );
          toast.success(`Granted all base permissions to ${selectedRole}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to grant base permissions");
        }
      });
    }
  }

  // Handle user override change
  function handleUserOverride(code: string, mode: "INHERIT" | "GRANT" | "REVOKE") {
    if (!selectedUserId) return;

    const allowed = mode === "GRANT" ? true : mode === "REVOKE" ? false : null;

    setUserOverridesState((prev) => {
      const filtered = prev.filter(
        (o) => !(o.userId === selectedUserId && o.permissionCode === code)
      );
      if (allowed !== null) {
        return [...filtered, { userId: selectedUserId, permissionCode: code, allowed }];
      }
      return filtered;
    });

    startTransition(async () => {
      try {
        await updateUserPermissionOverride(selectedUserId, code, allowed);
        toast.success(`Updated override for ${code}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update user override");
      }
    });
  }

  // Handle reset ALL roles to defaults (fresh start)
  function handleResetAllRoles() {
    const confirmed = window.confirm(
      "⚠️ Reset ALL role permissions to defaults?\n\nThis will delete all custom permission overrides for every role and restore the original default matrix. This action cannot be undone."
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await resetAllRolesPermissions();
        // Rebuild local state from defaults
        const newState: RolePermissionRow[] = [];
        for (const [roleKey, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
          if (roleKey === "MANAGER") continue;
          for (const def of PERMISSION_DEFINITIONS) {
            newState.push({
              roleId: roleKey,
              permissionCode: def.code,
              allowed: (perms as string[]).includes(def.code),
            });
          }
        }
        setRolePermissionsState(newState);
        setDynamicRolePermissionsState([]); // Wipe all dynamic sub-role permissions
        toast.success("All system-wide permissions reset to defaults successfully.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reset all role permissions");
      }
    });
  }

  const roleTitle = selectedApiRole ? selectedApiRole.name : "Select a specific Sub-Role";
  const roleDesc = selectedApiRole?.description || "Select a specific role from the hierarchy tree above to view its underlying permissions.";

  return (
    <div className="space-y-6">


      <Tabs defaultValue="role-matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="role-matrix">Role Permissions</TabsTrigger>
          <TabsTrigger value="user-overrides">User Overrides</TabsTrigger>
          <TabsTrigger value="feature-matrix">Feature Grid</TabsTrigger>
        </TabsList>

        {/* ── 1. ROLE PERMISSIONS MATRIX TAB ── */}
        <TabsContent value="role-matrix" className="space-y-6 mt-4">
          {/* Dynamic Hierarchy Tree from Pragya API */}
          <Card className="p-4 overflow-hidden border-border/70 shadow-sm">
            <h4 className="text-sm font-bold text-foreground mb-4">Organizational Hierarchy</h4>
            <div className="flex flex-col gap-2">
              {LEVELS.map((lvl) => {
                const rolesInLevel = departments
                  .flatMap((d: any) => (d.roles || []).map((r: any) => ({ ...r, departmentName: d.name })))
                  .filter((r: any) => r.hierarchy_level === lvl.level);

                return (
                  <div key={lvl.level} className="flex flex-col gap-1 rounded-lg border border-border/50 p-2">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setExpandedLevels((p) => ({ ...p, [lvl.level]: !p[lvl.level] }))}
                        className="flex-1 flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors py-1 cursor-pointer text-left"
                      >
                        <Badge variant="outline" className="w-6 justify-center bg-muted/50 pointer-events-none">{lvl.level}</Badge>
                        {lvl.name} (Base Role: {lvl.roleId})
                      </button>
                    </div>

                    {expandedLevels[lvl.level] && (
                      <div className="ml-5 mt-2 flex flex-col gap-1 border-l-2 border-muted pl-3">
                        {rolesInLevel.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic py-1 px-2">No roles</span>
                        ) : (
                          rolesInLevel.map((role: any) => {
                            const isSelected = selectedApiRole?.name === (role.name || role.role);
                            return (
                              <button
                                key={role.id}
                                onClick={() => {
                                  setSelectedRole(lvl.roleId);
                                  setSelectedApiRole({ 
                                    id: String(role.id),
                                    name: role.name || role.role, 
                                    description: `Department: ${role.departmentName}`,
                                    baseRole: lvl.roleId
                                  });
                                }}
                                className={`flex items-center justify-between group hover:bg-muted/50 rounded-md px-3 py-2 w-full transition-all text-left ${isSelected ? "bg-primary/10 border-primary/20 border" : "border border-transparent"}`}
                              >
                                <span className={`text-[12px] font-medium flex-1 flex items-center gap-2 ${isSelected ? "text-primary font-bold" : "text-slate-700 dark:text-slate-300"}`}>
                                  {role.name || role.role}
                                  <span className="text-[10px] text-muted-foreground opacity-60 hidden sm:inline-block font-normal">({role.departmentName})</span>
                                </span>
                                <span 
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground opacity-0 group-hover:opacity-100"} transition-opacity`}
                                >
                                  {isSelected ? "Selected" : "Manage"}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg">
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                <strong>True Granular Control:</strong> Permissions can now be assigned strictly per Sub-Role. Clicking <strong>Manage</strong> on any sub-role allows you to customize its permissions independently, overriding the base hierarchy level. Use the <strong>User Overrides</strong> tab to control permissions for specific individual users.
              </p>
            </div>
          </Card>

          {/* Active Role Header Banner */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">{roleTitle}</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Base: {selectedApiRole ? selectedApiRole.baseRole : selectedRole}
                  </Badge>
                  {selectedApiRole && (
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      Dynamic Sub-Role Permissions Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{roleDesc}</p>
              </div>

                {selectedRole !== "MANAGER" || selectedApiRole ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetDefaults}
                      disabled={isPending}
                      className="h-8 gap-1.5 text-xs font-semibold text-destructive hover:text-destructive"
                    >
                      <RotateCcw className="size-3.5" /> Clear All Permissions
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleGrantAll}
                      disabled={isPending}
                      className="h-8 gap-1.5 text-xs font-semibold"
                    >
                      <CheckCheck className="size-3.5" /> Grant All
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                    <Sparkles className="size-4" /> Permanent Super Authority (All Enabled)
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Filters & Search Toolbar */}
          {selectedApiRole ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search permissions…"
                      className="h-9 rounded-lg pl-8 text-xs focus-visible:ring-primary"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-9 w-44 rounded-lg text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground self-start sm:self-center">
                  Showing {filteredPermissions.length} permissions
                </p>
              </div>

              {/* Granular Permission Rows */}
              <div className="space-y-3">
            {filteredPermissions.map((def) => {
              const isAllowed = activeRolePermissionsMap.get(def.code) ?? false;
              const isSuper = selectedRole === "MANAGER";

              return (
                <div
                  key={def.code}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-xs"
                >
                  <div className="space-y-0.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{def.name}</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        {def.category}
                      </Badge>
                      <code className="text-[11px] font-mono text-muted-foreground opacity-75">
                        {def.code}
                      </code>
                    </div>
                    {def.description && (
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold ${
                        isAllowed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground opacity-50"
                      }`}
                    >
                      {isAllowed ? "Allowed" : "Disabled"}
                    </span>
                    <Switch
                      checked={isAllowed}
                      disabled={(isSuper && !selectedApiRole) || isPending}
                      onCheckedChange={() => handleTogglePermission(def.code, isAllowed)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed bg-muted/10">
              <div className="rounded-full bg-muted/50 p-3 mb-4">
                <Search className="size-6 text-muted-foreground opacity-50" />
              </div>
              <p className="text-sm font-semibold text-foreground">No Sub-Role Selected</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Please expand a department from the organizational hierarchy above and click "Manage" on a specific role to configure its dynamic permissions.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── 2. USER OVERRIDES TAB ── */}
        <TabsContent value="user-overrides" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User-Level Permission Overrides</CardTitle>
              <CardDescription className="text-xs">
                Grant or revoke specific permissions for an individual user, overriding their base role defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-full sm:w-80">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.roleId}) — {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeUser && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2 text-xs">
                    <UserAvatar name={activeUser.name} image={activeUser.image} className="size-7" />
                    <div>
                      <p className="font-bold text-foreground">{activeUser.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Role: <span className="font-semibold text-primary">{activeUser.roleId}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Overrides Table */}
              <div className="space-y-2">
                {PERMISSION_DEFINITIONS.map((def) => {
                  const baseAllowed = activeUser?.roleId === "MANAGER";
                  const overrideVal = activeUserOverridesMap.get(def.code);

                  const effectiveAllowed =
                    overrideVal !== undefined ? overrideVal : baseAllowed;

                  const overrideState =
                    overrideVal === true
                      ? "GRANT"
                      : overrideVal === false
                      ? "REVOKE"
                      : "INHERIT";

                  return (
                    <div
                      key={def.code}
                      className="flex items-center justify-between rounded-lg border p-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{def.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {def.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Base Role: {baseAllowed ? "Allowed" : "Denied"} · Effective:{" "}
                          <span
                            className={
                              effectiveAllowed
                                ? "font-bold text-emerald-600"
                                : "font-bold text-rose-600"
                            }
                          >
                            {effectiveAllowed ? "ALLOWED" : "DENIED"}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={overrideState === "INHERIT" ? "secondary" : "ghost"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handleUserOverride(def.code, "INHERIT")}
                        >
                          Inherit Role
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={overrideState === "GRANT" ? "default" : "outline"}
                          className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleUserOverride(def.code, "GRANT")}
                        >
                          Force Grant
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={overrideState === "REVOKE" ? "destructive" : "outline"}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => handleUserOverride(def.code, "REVOKE")}
                        >
                          Force Revoke
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3. FEATURE ACCESS GRID TAB ── */}
        <TabsContent value="feature-matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">System-Wide Feature Access Grid</CardTitle>
              <CardDescription className="text-xs">
                Comprehensive matrix comparing module access across all system roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 font-bold">
                    <th className="p-3">Feature Module</th>
                    {LEVELS.map((r) => (
                      <th key={r.roleId} className="p-2 text-center">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {PERMISSION_DEFINITIONS.filter((d) => d.category === "Feature Access").map(
                    (def) => (
                      <tr key={def.code} className="hover:bg-muted/20">
                        <td className="p-3 font-semibold">
                          <p>{def.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground opacity-70">
                            {def.code}
                          </p>
                        </td>
                        {LEVELS.map((r) => {
                          // Use live DB-backed state for accuracy (not just static defaults)
                          let isAllowed: boolean;
                          if (r.roleId === "MANAGER") {
                            isAllowed = true;
                          } else {
                            // Check DB-backed rolePermissionsState first
                            const dbRow = rolePermissionsState.find(
                              (row) => row.roleId === r.roleId && row.permissionCode === def.code
                            );
                            if (dbRow !== undefined) {
                              isAllowed = dbRow.allowed;
                            } else {
                              // Fall back to static defaults if no DB row exists
                              isAllowed = DEFAULT_ROLE_PERMISSIONS[r.roleId]?.includes(def.code) ?? false;
                            }
                          }
                          return (
                            <td key={r.roleId} className="p-2 text-center">
                              {isAllowed ? (
                                <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                              ) : (
                                <XCircle className="mx-auto size-4 text-muted-foreground/30" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
