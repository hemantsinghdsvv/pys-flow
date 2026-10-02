import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser, companyFilter, companyScope } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  StudentsTable,
  type StudentRow,
} from "@/features/students/components/students-table";
import { BulkUploadDialog } from "@/features/students/components/bulk-upload-dialog";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const user = await requireUser();
  if (!can(user, "feature:students") && !can(user, "user:read")) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);
  const activeCompanyId = await companyScope(user);

  const isSuperAdmin = user.isSystemAdmin === true;
  const canCreate = user.role !== "EXECUTIVE";

  const [profiles, companies] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { ...scope, user: { deletedAt: null } },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, isActive: true },
        },
        batch: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    isSuperAdmin
      ? prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const rows: StudentRow[] = profiles.map((p) => ({
    userId: p.user.id,
    name: p.user.name,
    email: p.user.email,
    image: p.user.image,
    rollNumber: p.rollNumber,
    department: p.department,
    batchName: p.batch?.name ?? null,
    companyName: p.company.name,
    skills: p.skills,
    isActive: p.user.isActive,
  }));

  return (
    <>
      <PageHeader
        title="Students"
        description="Every intern across your companies, with profiles and status."
        actions={
          <div className="flex items-center gap-2">
            {isSuperAdmin && <BulkUploadDialog companies={companies} activeCompanyId={activeCompanyId} />}
            {canCreate && (
              <Button asChild>
                <Link href="/students/new">
                  <Plus className="size-4" /> Add student
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <StudentsTable data={rows} canDelete={isSuperAdmin} />
    </>
  );
}
