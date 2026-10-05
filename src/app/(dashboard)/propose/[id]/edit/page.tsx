import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission, assertCompanyAccess, companyFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalForm } from "@/features/propose/components/proposal-form";

export const metadata: Metadata = { title: "Edit Proposal" };

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("proposal:update");

  const proposal = await prisma.proposal.findUnique({
    where: { id, deletedAt: null },
    include: { company: { select: { id: true, name: true } } },
  });

  if (!proposal) notFound();
  await assertCompanyAccess(user, proposal.companyId);

  const scope = await companyFilter(user);

  const [mentors, studios] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...scope,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        orgRole: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit “${proposal.title}”`}
        description="Update proposal details, learning outcomes, schedule, capacity, or attached assets."
      />
      <ProposalForm
        proposal={proposal}
        mentors={mentors}
        studios={studios}
      />
    </div>
  );
}
