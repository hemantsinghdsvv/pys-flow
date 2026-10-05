import type { Metadata } from "next";
import Link from "next/link";
import { Plus, KeyRound } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser, companyFilter, companyScope } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MentorsTable, type StaffRow } from "@/features/mentors/components/mentors-table";
import { BulkUploadDialog } from "@/features/mentors/components/bulk-upload-dialog";

export const metadata: Metadata = { title: "Team Leads & Staff" };

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; password?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "feature:mentors") && !can(user, "user:read")) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);
  const activeCompanyId = await companyScope(user);
  const { created, password } = await searchParams;
  const isSuperAdmin = user.isSystemAdmin === true;

  const [staff, companies] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...scope,
        
        deletedAt: null, // Don't show soft-deleted users
      },
      include: {
        company: { select: { name: true } },
        orgRole: true,
        _count: { select: { mentorProjects: true } },
      },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    }),
    isSuperAdmin
      ? prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const rows: StaffRow[] = staff.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    image: member.image,
    role: member.orgRole?.name || (member.isSystemAdmin ? "System Admin" : "User"),
    companyName: member.company?.name ?? null,
    designation: member.designation,
    projectCount: member._count.mentorProjects,
    isActive: member.isActive,
  }));

  return (
    <>
      {created && password && (
        <Alert>
          <KeyRound className="size-4" />
          <AlertTitle>User created: {created}</AlertTitle>
          <AlertDescription>
            Temporary password:{" "}
            <code className="font-mono font-semibold">{password}</code> — share
            it now; it is not shown again.
          </AlertDescription>
        </Alert>
      )}

      <PageHeader
        title="Team Leads & Staff"
        description="Team leads, supervisors, coordinators, and teachers across studios."
        actions={
          <div className="flex items-center gap-2">
            {isSuperAdmin && <BulkUploadDialog companies={companies} activeCompanyId={activeCompanyId} />}
            <Button asChild>
              <Link href="/mentors/new">
                <Plus className="size-4" /> Add user
              </Link>
            </Button>
          </div>
        }
      />

      <MentorsTable data={rows} canDelete={isSuperAdmin} />
    </>
  );
}
