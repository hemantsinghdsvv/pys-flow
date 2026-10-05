import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { Users, Pencil, FolderKanban } from "lucide-react";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BATCH_STATUS_LABELS, PROJECT_STATUS_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AssignStudentsDialog } from "@/features/batches/components/assign-students-dialog";
import { RemoveStudentButton } from "@/features/batches/components/remove-student-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Batch Cohort - Pragya Yog School" };

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const canAccess =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "feature:batches") ||
    can(user, "batch:read");

  if (!canAccess) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      students: {
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              hierarchyLevel: true,
              orgRole: { select: { name: true, hierarchyLevel: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      projects: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true },
      },
    },
  });
  if (!batch) notFound();
  assertCompanyAccess(user, batch.companyId);

  const assignedUserIds = new Set(batch.students.map((s) => s.user.id));

  // All active members in the same studio or global without this batch
  const unassignedUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      id: { notIn: Array.from(assignedUserIds) },
      ...(batch.companyId
        ? {
            OR: [
              { companyId: batch.companyId },
              { companyId: null },
            ],
          }
        : {}),
    },
    include: {
      orgRole: true,
      studentProfile: true,
    },
    orderBy: [
      { hierarchyLevel: "asc" },
      { name: "asc" },
    ],
  });

  const canManage =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "batch:update");

  return (
    <>
      <PageHeader
        title={batch.name}
        description={`${batch.company.name} · ${format(batch.startDate, "d MMM yyyy")} – ${format(batch.endDate, "d MMM yyyy")}`}
        actions={
          canManage && (
            <Button variant="outline" asChild>
              <Link href={`/batches/${batch.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
          )
        }
      />

      <div className="flex items-center gap-2">
        <StatusBadge
          status={batch.status}
          label={BATCH_STATUS_LABELS[batch.status]}
        />
        {batch.description && (
          <p className="text-sm text-muted-foreground">{batch.description}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" /> Batch Members ({batch.students.length})
            </CardTitle>
            {canManage && (
              <AssignStudentsDialog
                batchId={batch.id}
                options={unassignedUsers.map((u) => {
                  const level = u.orgRole?.hierarchyLevel ?? u.hierarchyLevel ?? 3;
                  const roleName = u.orgRole?.name || (level === 1 ? "Director / Admin" : level === 2 ? "Supervisor / Lead" : "Staff Member");
                  return {
                    value: u.id,
                    label: `${u.name} (Level ${level} · ${roleName})`,
                    hint: u.email,
                  };
                })}
              />
            )}
          </CardHeader>
          <CardContent>
            {batch.students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No members assigned"
                description="Assign teachers, instructors, supervisors, or staff members across any level to this batch."
              />
            ) : (
              <ul className="divide-y">
                {batch.students.map((profile) => {
                  const level = profile.user.orgRole?.hierarchyLevel ?? profile.user.hierarchyLevel ?? 3;
                  const roleName = profile.user.orgRole?.name || (level === 1 ? "Director / Admin" : level === 2 ? "Supervisor / Lead" : "Staff Member");
                  return (
                    <li
                      key={profile.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <UserAvatar
                        name={profile.user.name}
                        image={profile.user.image}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {profile.user.name}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#00381F]/10 text-[#00381F] dark:bg-[#D9AE29]/20 dark:text-[#D9AE29]">
                            Level {level}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                          <span>
                            {roleName} · {profile.user.email}
                          </span>
                        </p>
                      </div>
                      {canManage && (
                        <RemoveStudentButton
                          batchId={batch.id}
                          profileId={profile.id}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Projects ({batch.projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batch.projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects linked to this batch yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {batch.projects.map((project) => (
                  <li
                    key={project.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <FolderKanban className="size-4 text-muted-foreground" />
                      {project.name}
                    </Link>
                    <StatusBadge
                      status={project.status}
                      label={PROJECT_STATUS_LABELS[project.status]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
