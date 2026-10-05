import type { Metadata } from "next";
import { requirePermission, companyFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ProposalForm } from "@/features/propose/components/proposal-form";

export const metadata: Metadata = { title: "New Proposal" };

export default async function NewProposalPage() {
  const user = await requirePermission("proposal:create");
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
        title="Create New Proposal"
        description="Fill in the event or project specifications, learning objectives, schedule, capacity, and pricing."
      />
      <ProposalForm mentors={mentors} studios={studios} />
    </div>
  );
}
