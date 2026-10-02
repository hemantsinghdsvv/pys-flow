import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  GitBranch,
  ExternalLink,
  Globe,
  FileText,
  Layers,
  Building2,
  KeyRound,
} from "lucide-react";
import { requireRole, assertCompanyAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { computeStudentScore } from "@/lib/scoring";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreRing } from "@/components/shared/score-ring";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ToggleActiveButton } from "@/features/students/components/toggle-active-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Student" };

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; password?: string }>;
}) {
  const user = await requireRole(
    "MANAGER",
    "MANAGER",
    "SENIOR",
    "EXECUTIVE"
  );
  const { id } = await params;
  const { created, password } = await searchParams;

  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      studentProfile: { include: { batch: true, company: true } },
      studentProjects: {
        include: { project: { select: { id: true, name: true, status: true } } },
      },
    },
  });
  if (!student || student.isSystemAdmin || !student.studentProfile) {
    notFound();
  }
  assertCompanyAccess(user, student.companyId);
  const profile = student.studentProfile;

  const score = student.companyId
    ? await computeStudentScore(student.id, student.companyId)
    : null;

  const canManage = user.role !== "EXECUTIVE";

  const SCORE_ROWS = score
    ? ([
        ["Reports", score.submissionScore],
        ["Attendance", score.attendanceScore],
        ["Tasks", score.taskCompletionScore],
        ["Reviews", score.reviewScore],
        ["Deadlines", score.deadlineScore],
        ["GitHub", score.githubScore],
      ] as const)
    : [];

  return (
    <>
      {created && password && (
        <Alert>
          <KeyRound className="size-4" />
          <AlertTitle>Student account created</AlertTitle>
          <AlertDescription>
            Temporary password: <code className="font-mono font-semibold">{password}</code>{" "}
            — share it with the student now; it is not shown again.
          </AlertDescription>
        </Alert>
      )}

      <PageHeader
        title={student.name}
        description={profile.rollNumber ?? student.email}
        actions={
          canManage && (
            <>
              <ToggleActiveButton userId={student.id} isActive={student.isActive} />
              <Button variant="outline" asChild>
                <Link href={`/students/${student.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <UserAvatar
              name={student.name}
              image={student.image}
              className="size-20 text-xl"
            />
            <div>
              <p className="font-semibold">{student.name}</p>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
            <StatusBadge
              status={student.isActive ? "ACTIVE" : "INACTIVE"}
              label={student.isActive ? "Active" : "Inactive"}
            />
            <div className="mt-2 flex items-center gap-2">
              {profile.githubUrl && (
                <Button variant="outline" size="icon" className="size-8" asChild>
                  <a href={profile.githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub">
                    <GitBranch className="size-4" />
                  </a>
                </Button>
              )}
              {profile.linkedinUrl && (
                <Button variant="outline" size="icon" className="size-8" asChild>
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              )}
              {profile.portfolioUrl && (
                <Button variant="outline" size="icon" className="size-8" asChild>
                  <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" aria-label="Portfolio">
                    <Globe className="size-4" />
                  </a>
                </Button>
              )}
              {profile.resumeUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={profile.resumeUrl} target="_blank" rel="noreferrer">
                    <FileText className="size-4" /> Resume
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internship</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                {profile.company.name}
              </p>
              <p className="flex items-center gap-2">
                <Layers className="size-4 text-muted-foreground" />
                {profile.batch ? (
                  <Link
                    href={`/batches/${profile.batch.id}`}
                    className="hover:underline"
                  >
                    {profile.batch.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">No batch</span>
                )}
              </p>
              {profile.department && <p>Dept: {profile.department}</p>}
              {student.phone && <p>Phone: {student.phone}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {score && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col items-center gap-2">
                  <ScoreRing
                    score={score.overallScore}
                    band={score.band}
                    size={88}
                    label="overall"
                  />
                  <StatusBadge status={score.band} label={`${score.band} band`} />
                </div>
                <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {SCORE_ROWS.map(([label, value]) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium tabular-nums">{value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {student.studentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Not assigned to any project yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {student.studentProjects.map(({ project }) => (
                    <li
                      key={project.id}
                      className="flex items-center justify-between"
                    >
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm hover:underline"
                      >
                        {project.name}
                      </Link>
                      <StatusBadge status={project.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
