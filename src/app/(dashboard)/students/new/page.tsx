import type { Metadata } from "next";
import { requireRole, companyScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StudentForm } from "@/features/students/components/student-form";

export const metadata: Metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  const user = await requireRole("MANAGER", "MANAGER", "SENIOR");
  const scope = await companyScope(user);

  const [batches, companies] = await Promise.all([
    prisma.batch.findMany({
      where: scope ? { companyId: scope } : {},
      select: { id: true, name: true },
      orderBy: { startDate: "desc" },
    }),
    user.isSystemAdmin === true && !scope
      ? prisma.company.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve(undefined),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Add student"
        description="Provision an intern account. The student signs in with the email and password you set."
      />
      <StudentForm batches={batches} companies={companies} />
    </div>
  );
}
