import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus, GraduationCap, FolderKanban, CalendarRange } from "lucide-react";
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

export const metadata: Metadata = { title: "Batches" };

export default async function BatchesPage() {
  const user = await requireUser();
  if (!can(user, "feature:batches") && !can(user, "batch:read")) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);

  const batches = await prisma.batch.findMany({
    where: { ...scope },
    orderBy: { startDate: "desc" },
    include: {
      company: { select: { name: true, themeColor: true } },
      _count: {
        select: {
          students: { where: { deletedAt: null } },
          projects: { where: { deletedAt: null } },
        },
      },
    },
  });

  const canCreate = user.role !== "EXECUTIVE";

  return (
    <>
      <PageHeader
        title="Internship Batches"
        description="Cohorts of students running internships together."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/batches/new">
                <Plus className="size-4" /> New batch
              </Link>
            </Button>
          )
        }
      />

      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches yet"
          description="Create a batch like “Summer Internship 2026” and assign students to it."
          action={
            canCreate && (
              <Button asChild size="sm">
                <Link href="/batches/new">
                  <Plus className="size-4" /> New batch
                </Link>
              </Button>
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
                      <GraduationCap className="size-4" />
                      {batch._count.students} students
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
