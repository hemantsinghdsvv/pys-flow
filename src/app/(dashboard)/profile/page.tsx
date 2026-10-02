import type { Metadata } from "next";
import { Building2, Mail, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { computeStudentScore } from "@/lib/scoring";
import { ROLE_LABELS } from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ScoreRing } from "@/components/shared/score-ring";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      company: { select: { name: true } },
      studentProfile: true,
      orgRole: true,
    },
  });
  if (!user) return null;

  const isStudent = !!user.studentProfile;
  const score =
    isStudent && user.companyId
      ? await computeStudentScore(user.id, user.companyId)
      : null;

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Manage your account details and public links."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <UserAvatar
              name={user.name}
              image={user.image}
              className="size-20 text-xl"
            />
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Mail className="size-3.5" /> {user.email}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="size-3.5" /> {user.orgRole?.name || (user.isSystemAdmin ? "System Admin" : "User")}
              </span>
              {user.company && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="size-3.5" /> {user.company.name}
                </span>
              )}
            </div>
            {score && (
              <div className="mt-2 flex flex-col items-center gap-2 border-t pt-4">
                <ScoreRing
                  score={score.overallScore}
                  band={score.band}
                  label="score"
                />
                <StatusBadge status={score.band} label={`${score.band} band`} />
                <p className="text-xs text-muted-foreground">
                  Performance over the last 30 days
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <ProfileForm
            isStudent={isStudent}
            initial={{
              name: user.name,
              phone: user.phone ?? "",
              designation: user.designation ?? "",
              githubUrl: user.studentProfile?.githubUrl ?? "",
              linkedinUrl: user.studentProfile?.linkedinUrl ?? "",
              portfolioUrl: user.studentProfile?.portfolioUrl ?? "",
              skills: user.studentProfile?.skills ?? [],
            }}
          />
        </div>
      </div>
    </>
  );
}
