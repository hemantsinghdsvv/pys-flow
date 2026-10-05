import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus, Users, FolderKanban, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BATCH_STATUS_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { CreateBatchDialog } from "@/features/batches/components/create-batch-dialog";

export const metadata: Metadata = { title: "Batches & Cohorts - Pragya Yog School" };

export default async function BatchesPage() {
  const user = await requireUser();
  const hasAccess =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "feature:batches") ||
    can(user, "batch:read");

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const scope = await companyFilter(user);

  const [batches, studios] = await Promise.all([
    prisma.batch.findMany({
      where: { ...scope, deletedAt: null },
      orderBy: { startDate: "desc" },
      include: {
        company: { select: { id: true, name: true, themeColor: true } },
        _count: {
          select: {
            students: { where: { deletedAt: null } },
            projects: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.company.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canCreate =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "batch:create");

  return (
    <>
      <PageHeader
        title="Batches & Cohorts"
        description="Cohorts of students and trainees running teacher trainings, programs, and workshops together."
        actions={
          canCreate && (
            <div className="flex items-center gap-2">
              <CreateBatchDialog
                studios={studios}
                trigger={
                  <Button className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-9 gap-1.5 shadow-xs font-medium">
                    <Plus className="size-4" />
                    <span>Create Batch</span>
                  </Button>
                }
              />
            </div>
          )
        }
      />

      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches yet"
          description="Create a batch like “TTC Morning Cohort 2026” and assign trainees or link initiatives to it."
          action={
            canCreate && (
              <CreateBatchDialog
                studios={studios}
                trigger={
                  <Button size="sm" className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5">
                    <Plus className="size-4" /> Create First Batch
                  </Button>
                }
              />
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {batches.map((batch) => (
            <Link key={batch.id} href={`/batches/${batch.id}`}>
              <Card className="group h-full py-5 transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium group-hover:underline">
                        {batch.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batch.company.name}
                      </p>
                    </div>
                    <StatusBadge
                      status={batch.status}
                      label={BATCH_STATUS_LABELS[batch.status]}
                    />
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarRange className="size-4" />
                    {format(batch.startDate, "d MMM yyyy")} –{" "}
                    {format(batch.endDate, "d MMM yyyy")}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" />
                      {batch._count.students} staff members
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="size-4" />
                      {batch._count.projects} projects
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
