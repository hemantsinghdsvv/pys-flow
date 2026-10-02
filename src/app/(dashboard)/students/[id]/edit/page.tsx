import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole, assertCompanyAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StudentForm } from "@/features/students/components/student-form";

export const metadata: Metadata = { title: "Edit Student" };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("MANAGER", "MANAGER", "SENIOR");
  const { id } = await params;

  const student = await prisma.user.findUnique({
    where: { id },
    include: { studentProfile: true },
  });
  if (!student || student.isSystemAdmin || !student.studentProfile) {
    notFound();
  }
  assertCompanyAccess(user, student.companyId);
  const profile = student.studentProfile;

  const batches = await prisma.batch.findMany({
    where: { companyId: profile.companyId },
    select: { id: true, name: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={`Edit ${student.name}`} />
      <StudentForm
        batches={batches}
        initial={{
          userId: student.id,
          name: student.name,
          email: student.email,
          password: "",
          phone: student.phone ?? "",
          rollNumber: profile.rollNumber ?? "",
          department: profile.department ?? "",
          batchId: profile.batchId ?? "",
          skills: profile.skills,
          githubUrl: profile.githubUrl ?? "",
          linkedinUrl: profile.linkedinUrl ?? "",
          portfolioUrl: profile.portfolioUrl ?? "",
        }}
      />
    </div>
  );
}
