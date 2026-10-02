import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole, assertCompanyAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/features/batches/components/batch-form";
import { DeleteBatchButton } from "@/features/batches/components/delete-batch-button";

export const metadata: Metadata = { title: "Edit Batch" };

export default async function EditBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("MANAGER", "MANAGER", "SENIOR");
  const { id } = await params;
  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) notFound();
  assertCompanyAccess(user, batch.companyId);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title={`Edit ${batch.name}`}
        actions={<DeleteBatchButton batchId={batch.id} batchName={batch.name} />}
      />
      <BatchForm batch={batch} />
    </div>
  );
}
