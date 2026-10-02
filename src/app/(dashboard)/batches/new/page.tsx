import type { Metadata } from "next";
import { requireRole, companyScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/features/batches/components/batch-form";

export const metadata: Metadata = { title: "New Batch" };

export default async function NewBatchPage() {
  const user = await requireRole("MANAGER", "MANAGER", "SENIOR");

  let companies;
  if (user.isSystemAdmin === true && !(await companyScope(user))) {
    companies = await prisma.company.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="New batch"
        description="Create an internship cohort with a start and end date."
      />
      <BatchForm companies={companies} />
    </div>
  );
}
