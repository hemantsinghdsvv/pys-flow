import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { YogaProjectForm } from "@/features/projects/components/yoga-project-form";

export const metadata: Metadata = { title: "New Project - Pragya Yog School" };

export default async function NewProjectPage() {
  const user = await requireUser();
  const canCreate =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "project:create");

  if (!canCreate) {
    redirect("/projects");
  }

  const scope = await companyFilter(user);
  const [batches, studios] = await Promise.all([
    prisma.batch.findMany({
      where: { deletedAt: null, ...scope },
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.company.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Create New Operational Initiative"
        description="Launch and structure a new yoga program, teacher training batch, or school project."
      />
      <YogaProjectForm batches={batches} studios={studios} />
    </div>
  );
}
