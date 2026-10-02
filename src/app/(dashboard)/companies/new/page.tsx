import type { Metadata } from "next";
import { requireRole } from "@/lib/access";
import { PageHeader } from "@/components/shared/page-header";
import { CompanyForm } from "@/features/companies/components/company-form";

export const metadata: Metadata = { title: "New Company" };

export default async function NewCompanyPage() {
  await requireRole("MANAGER");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Add company"
        description="Onboard a new company to run internships on DRISHTI."
      />
      <CompanyForm />
    </div>
  );
}
