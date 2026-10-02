import type { Metadata } from "next";
import { requireRole, companyScope } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { MentorForm } from "@/features/mentors/components/mentor-form";

export const metadata: Metadata = { title: "Add Staff User" };

export default async function NewMentorPage() {
  const user = await requireRole("MANAGER", "MANAGER", "SENIOR");
  const scope = await companyScope(user);

  const companies =
    user.isSystemAdmin === true && !scope
      ? await prisma.company.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader
        title="Add staff user"
        description="Create a mentor, coordinator, or company admin account."
      />
      <MentorForm
        companies={companies}
        canCreateAdmin={user.role !== "SENIOR"}
      />
    </div>
  );
}
