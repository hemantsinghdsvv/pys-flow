import type { Metadata } from "next";
import { Users, ShieldCheck, UserCheck, Building2, Briefcase } from "lucide-react";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddRoleModal } from "@/features/team/components/add-role-modal";
import { AssignRoleDialog } from "@/features/team/components/assign-role-dialog";
import { AddTeamMemberModal } from "@/features/team/components/add-team-member-modal";
import { DeleteMemberButton } from "@/features/team/components/delete-member-button";

export const metadata: Metadata = { title: "Staff & Roles - Pragya Yog School" };

export default async function TeamPage() {
  const currentUser = await requireUser();
  const isAdmin = currentUser.hierarchyLevel === 1 || currentUser.isSystemAdmin === true;
  const canAddMembers = isAdmin || (currentUser.hierarchyLevel ?? 4) <= 3;

  const [roles, departments, studios, staffMembers] = await Promise.all([
    prisma.orgRole.findMany({
      orderBy: { hierarchyLevel: "asc" },
      include: {
        _count: { select: { users: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        orgRole: true,
        department: true,
        company: true,
      },
      orderBy: [{ hierarchyLevel: "asc" }, { name: "asc" }],
    }),
  ]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Yoga School Staff & Organization Roles"
        description="The 7 foundational roles are initialized. Department leaders and Director Aarya Kuldeep can onboard and manage their teams directly."
        actions={
          <div className="flex items-center gap-2">
            {canAddMembers && (
              <AddTeamMemberModal
                roles={roles}
                departments={departments}
                currentUserLevel={currentUser.hierarchyLevel ?? 3}
                currentUserDeptId={currentUser.departmentId}
                isAdmin={isAdmin}
              />
            )}
            {isAdmin && <AddRoleModal />}
          </div>
        }
      />

      {/* ── Roles Grid Showcase ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-sm font-bold font-serif uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#00381F]" />
            Defined Organizational Roles ({roles.length})
          </h2>
          <span className="text-xs text-muted-foreground">Admin Aarya Kuldeep has full rights across the entire school</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {roles.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2 hover:border-[#00381F]/40 transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">{r.name}</h3>
                <Badge
                  variant={r.hierarchyLevel === 1 ? "default" : "outline"}
                  className={r.hierarchyLevel === 1 ? "bg-[#00381F] text-[#F5EFE5] text-[10px]" : "text-[10px]"}
                >
                  Level {r.hierarchyLevel ?? 3}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {r.description || "Operational team role."}
              </p>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Staff assigned:</span>
                <span className="font-bold text-[#00381F]">{r._count.users} members</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Staff Directory & Assignment Table ── */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden space-y-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm font-serif text-foreground flex items-center gap-2">
              <Users className="size-4 text-[#00381F]" />
              Staff Directory ({staffMembers.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current team members across the 4 Yoga School departments.
            </p>
          </div>
        </div>

        {/* ── Mobile Card View ── */}
        <div className="md:hidden divide-y divide-border">
          {staffMembers.map((staff) => {
            const isDirector = staff.isSystemAdmin || staff.email === "admin@pyshk.com";
            const canManageStaff = isAdmin || (!isDirector && (staff.hierarchyLevel ?? 4) > (currentUser.hierarchyLevel ?? 4) && staff.departmentId === currentUser.departmentId);
            return (
              <div key={staff.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                      {staff.name}
                      {isDirector && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Director</span>}
                      {staff.isActive === false && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Inactive</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{staff.email}</div>
                  </div>
                  {(isAdmin || canManageStaff) && (
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && (
                        <AssignRoleDialog
                          user={{ id: staff.id, name: staff.name, email: staff.email, phone: staff.phone, roleId: staff.roleId, departmentId: staff.departmentId, companyId: staff.companyId, designation: staff.designation, isActive: staff.isActive }}
                          roles={roles}
                          departments={departments}
                          studios={studios}
                        />
                      )}
                      {!isDirector && canManageStaff && <DeleteMemberButton userId={staff.id} userName={staff.name} />}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div><span className="font-medium text-foreground">Role: </span>{staff.orgRole?.name || "General Staff"}</div>
                  <div><span className="font-medium text-foreground">Dept: </span>{staff.department?.name || "—"}</div>
                  <div className="col-span-2"><span className="font-medium text-foreground">Designation: </span>{staff.designation || staff.orgRole?.name || "Staff Member"}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Staff Member</th>
                <th className="px-4 py-3 text-left">Assigned Role</th>
                <th className="px-4 py-3 text-left">Department / Team</th>
                <th className="px-4 py-3 text-left">Studio Location</th>
                <th className="px-4 py-3 text-left">Designation</th>
                {(isAdmin || canAddMembers) && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staffMembers.map((staff) => {
                const isDirector = staff.isSystemAdmin || staff.email === "admin@pyshk.com";
                const canManageStaff = isAdmin || (!isDirector && (staff.hierarchyLevel ?? 4) > (currentUser.hierarchyLevel ?? 4) && staff.departmentId === currentUser.departmentId);
                return (
                  <tr key={staff.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {staff.name}
                        {isDirector && <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Director</span>}
                        {staff.isActive === false && <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Inactive</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{staff.email}</div>
                      {staff.phone && <div className="text-[11px] text-muted-foreground/80">{staff.phone}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      {staff.orgRole ? (
                        <Badge variant="outline" className="font-medium text-xs bg-slate-50 dark:bg-slate-900">{staff.orgRole.name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">General Staff</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {staff.department ? <span className="font-medium text-foreground">{staff.department.name}</span> : <span>—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {staff.company ? <span className="font-medium text-foreground">{staff.company.name}</span> : <span className="text-muted-foreground/80">All Studios</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-foreground">
                      {staff.designation || staff.orgRole?.name || "Staff Member"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <AssignRoleDialog
                            user={{ id: staff.id, name: staff.name, email: staff.email, phone: staff.phone, roleId: staff.roleId, departmentId: staff.departmentId, companyId: staff.companyId, designation: staff.designation, isActive: staff.isActive }}
                            roles={roles}
                            departments={departments}
                            studios={studios}
                          />
                        )}
                        {!isDirector && canManageStaff && <DeleteMemberButton userId={staff.id} userName={staff.name} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
