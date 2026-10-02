import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Building2, Plus, FolderKanban, GraduationCap, Layers } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { can } from "@/lib/permissions";
import { getCompanies } from "@/features/companies/queries";
import { COMPANY_STATUS_LABELS, INTERNSHIP_TYPE_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const user = await requireUser();
  if (!can(user, "feature:companies") && !can(user, "company:read")) {
    redirect("/dashboard");
  }
  const companies = await getCompanies();

  return (
    <>
      <PageHeader
        title="Companies"
        description="Manage every company running internships on DRISHTI."
        actions={
          <Button asChild>
            <Link href="/companies/new">
              <Plus className="size-4" /> Add company
            </Link>
          </Button>
        }
      />

      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Create your first company to start managing internship batches, projects, and students."
          action={
            <Button asChild size="sm">
              <Link href="/companies/new">
                <Plus className="size-4" /> Add company
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="group h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: company.themeColor }}
                />
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {company.logoUrl ? (
                        <Image
                          src={company.logoUrl}
                          alt={company.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="size-10 rounded-lg border object-cover"
                        />
                      ) : (
                        <div
                          className="flex size-10 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: company.themeColor }}
                        >
                          <Building2 className="size-5" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium leading-tight group-hover:underline">
                          {company.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {company.industry ?? "—"} ·{" "}
                          {INTERNSHIP_TYPE_LABELS[company.internshipType]}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={company.status}
                      label={COMPANY_STATUS_LABELS[company.status]}
                    />
                  </div>

                  {company.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {company.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="size-4" />
                      {company._count.users}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="size-4" />
                      {company._count.projects}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-4" />
                      {company._count.batches}
                    </span>
                  </div>

                  {company.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {company.techStack.slice(0, 4).map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {company.techStack.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{company.techStack.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
