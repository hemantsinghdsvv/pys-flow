import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole, assertCompanyAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectForm } from "@/features/projects/components/project-form";

export const metadata: Metadata = { title: "Edit Project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("MANAGER", "MANAGER", "EXECUTIVE");
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();
  assertCompanyAccess(user, project.companyId);

  if (user.role === "EXECUTIVE") {
    const isMentor = await prisma.projectMentor.findUnique({
      where: { projectId_userId: { projectId: id, userId: user.id } },
    });
    if (!isMentor) notFound();
  }

  const batches = await prisma.batch.findMany({
    where: { companyId: project.companyId },
    select: { id: true, name: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={`Edit ${project.name}`} />
      <ProjectForm project={project} batches={batches} />
    </div>
  );
}
