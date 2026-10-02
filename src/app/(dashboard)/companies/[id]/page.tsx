import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Building2,
  FolderKanban,
  GraduationCap,
  Layers,
  Users,
  Pencil,
  Globe,
  Mail,
  Phone,
  Clock,
} from "lucide-react";
import { requireRole } from "@/lib/access";
import { getCompanyById } from "@/features/companies/queries";
import { DeleteCompanyButton } from "@/features/companies/components/delete-company-button";
import {
  COMPANY_STATUS_LABELS,
  INTERNSHIP_TYPE_LABELS,
} from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER", "MANAGER");
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();

  return (
    <>
      {company.bannerUrl && (
        <div className="relative -mx-4 -mt-4 h-40 overflow-hidden md:-mx-6 md:-mt-6 md:h-48">
          <Image
            src={company.bannerUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        </div>
      )}

      <PageHeader
        title={company.name}
        description={`${company.industry ?? "—"} · ${INTERNSHIP_TYPE_LABELS[company.internshipType]}${company.internshipDuration ? ` · ${company.internshipDuration}` : ""}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/companies/${company.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            <DeleteCompanyButton companyId={company.id} companyName={company.name} />
          </>
        }
      />

      <div className="flex items-center gap-3">
        {company.logoUrl ? (
          <Image
            src={company.logoUrl}
            alt={company.name}
            width={48}
            height={48}
            unoptimized
            className="size-12 rounded-xl border object-cover"
          />
        ) : (
          <div
            className="flex size-12 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: company.themeColor }}
          >
            <Building2 className="size-6" />
          </div>
        )}
        <StatusBadge
          status={company.status}
          label={COMPANY_STATUS_LABELS[company.status]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Students"
          value={company._count.users}
          icon={GraduationCap}
        />
        <StatCard
          title="Projects"
          value={company._count.projects}
          icon={FolderKanban}
        />
        <StatCard title="Batches" value={company._count.batches} icon={Layers} />
        <StatCard title="Teams" value={company._count.teams} icon={Users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {company.description ?? "No description provided."}
            </p>
            {company.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {company.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {company.contactPerson && (
              <p className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                {company.contactPerson}
              </p>
            )}
            {company.contactEmail && (
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <a
                  href={`mailto:${company.contactEmail}`}
                  className="hover:underline"
                >
                  {company.contactEmail}
                </a>
              </p>
            )}
            {company.contactPhone && (
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {company.contactPhone}
              </p>
            )}
            {company.website && (
              <p className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:underline"
                >
                  {company.website}
                </a>
              </p>
            )}
            {company.internshipDuration && (
              <p className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                {company.internshipDuration}
              </p>
            )}
            {!company.contactPerson &&
              !company.contactEmail &&
              !company.contactPhone &&
              !company.website && (
                <p className="text-muted-foreground">No contact details.</p>
              )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
