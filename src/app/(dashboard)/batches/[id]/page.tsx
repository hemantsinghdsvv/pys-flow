import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { GraduationCap, Pencil, FolderKanban } from "lucide-react";
import { requireRole, assertCompanyAccess } from "@/lib/access";
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

export const metadata: Metadata = { title: "Batch" };

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(
    "MANAGER",
    "MANAGER",
    "SENIOR",
    "EXECUTIVE"
  );
  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      students: {
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
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

  // Students in the same company without a batch — available to assign.
  const unassigned = await prisma.studentProfile.findMany({
    where: { companyId: batch.companyId, batchId: null },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const canManage = user.role !== "EXECUTIVE";

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
            <CardTitle className="text-base">
              Students ({batch.students.length})
            </CardTitle>
            {canManage && (
              <AssignStudentsDialog
                batchId={batch.id}
                options={unassigned.map((p) => ({
                  value: p.id,
                  label: p.user.name,
                  hint: p.rollNumber ?? undefined,
                }))}
              />
            )}
          </CardHeader>
          <CardContent>
            {batch.students.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No students assigned"
                description="Assign students from this company to the batch."
              />
            ) : (
              <ul className="divide-y">
                {batch.students.map((profile) => (
                  <li
                    key={profile.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <UserAvatar
                      name={profile.user.name}
                      image={profile.user.image}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/students/${profile.user.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {profile.user.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {profile.rollNumber ?? profile.user.email}
                      </p>
                    </div>
                    {canManage && (
                      <RemoveStudentButton
                        batchId={batch.id}
                        profileId={profile.id}
                      />
                    )}
                  </li>
                ))}
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
