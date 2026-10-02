import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { CompanyForm } from "@/features/companies/components/company-form";

export const metadata: Metadata = { title: "Edit Company" };

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("MANAGER", "MANAGER");
  const { id } = await params;
  if (user.isSystemAdmin !== true && user.companyId !== id) notFound();

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title={`Edit ${company.name}`}
        description="Update company details, branding, and internship configuration."
      />
      <CompanyForm company={company} />
    </div>
  );
}
