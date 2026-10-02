import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  User as UserIcon,
  Pencil,
  Send,
  Sparkles,
  ExternalLink,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_SCHEDULE_LABELS,
  PROPOSAL_LOCATION_LABELS,
} from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProposalReviewDialog } from "@/features/propose/components/proposal-review-dialog";
import { ConvertProposalDialog } from "@/features/propose/components/convert-dialog";
import { DeleteProposalButton } from "@/features/propose/components/delete-proposal-button";
import { submitProposalForReview } from "@/features/propose/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.proposal.findUnique({
    where: { id, deletedAt: null },
    select: { title: true },
  });
  return { title: p?.title ?? "Proposal Details" };
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const proposal = await prisma.proposal.findUnique({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true, image: true, email: true } },
      teacher: { select: { id: true, name: true, image: true, email: true } },
      reviewer: { select: { id: true, name: true, image: true } },
      company: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!proposal) notFound();
  await assertCompanyAccess(user, proposal.companyId);

  const batches = await prisma.batch.findMany({
    where: { companyId: proposal.companyId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { startDate: "desc" },
  });

  const isAssignedMentor =
    (proposal.teacherId && proposal.teacherId === user.id) ||
    (proposal.reviewerId && proposal.reviewerId === user.id) ||
    (proposal.createdById === user.id && user.role === "EXECUTIVE");
  const canReview = can(user, "proposal:review") || isAssignedMentor;
  const canEdit =
    user.role !== "INTERN" ||
    (proposal.createdById === user.id && (proposal.status === "DRAFT" || proposal.status === "REWORK"));
  const canDelete =
    user.isSystemAdmin === true ||
    proposal.createdById === user.id;

  const teacherDisplay = proposal.teacher?.name || proposal.teacherName || "Unassigned";

  return (
    <div className="space-y-6">
      <PageHeader
        title={proposal.title}
        description={`Proposed by ${proposal.createdBy.name} on ${format(proposal.createdAt, "d MMM yyyy")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={proposal.status} label={PROPOSAL_STATUS_LABELS[proposal.status]} />
            <StatusBadge status={proposal.type} label={PROPOSAL_TYPE_LABELS[proposal.type]} />

            {canEdit && proposal.status !== "CONVERTED" && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/propose/${proposal.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
            )}

            {(proposal.status === "DRAFT" || proposal.status === "REWORK") && (
              <form
                action={async () => {
                  "use server";
                  await submitProposalForReview(proposal.id);
                }}
              >
                <Button size="sm" type="submit">
                  <Send className="size-4" /> Submit for review
                </Button>
              </form>
            )}

            {canReview && (proposal.status === "SUBMITTED" || proposal.status === "UNDER_REVIEW") && (
              <ProposalReviewDialog
                proposalId={proposal.id}
                proposalTitle={proposal.title}
              />
            )}

            {proposal.status === "APPROVED" && (
              <ConvertProposalDialog
                proposalId={proposal.id}
                proposalTitle={proposal.title}
                batches={batches}
              />
            )}

            {proposal.project && (
              <Button size="sm" variant="default" asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href={`/kanban?project=${proposal.project.id}`}>
                  <Sparkles className="size-4" /> View Kanban Board
                </Link>
              </Button>
            )}

            {canDelete && (
              <DeleteProposalButton
                proposalId={proposal.id}
                proposalTitle={proposal.title}
              />
            )}
          </div>
        }
      />

      {/* Top Banner if Converted */}
      {proposal.project && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-emerald-950 dark:text-emerald-200">
                  Promoted to Active Project: {proposal.project.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Parallel Kanban tasks for Design, Webpage, Backend, App, Marketing, and Accounts are live.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/projects/${proposal.project.id}`}>
                  Project details
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href={`/kanban?project=${proposal.project.id}`}>
                  <ExternalLink className="size-4" /> Open Kanban board
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Feedback Alert if Rework / Rejected */}
      {proposal.status === "REWORK" && proposal.reviewFeedback && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="size-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-950 dark:text-orange-200">
                Rework Requested by Reviewer {proposal.reviewer?.name ? `(${proposal.reviewer.name})` : ""}
              </p>
              <p className="text-sm mt-1 text-orange-900 dark:text-orange-300">
                {proposal.reviewFeedback}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cover Banner Image if provided */}
          {proposal.mediaUrl && (
            <div className="overflow-hidden rounded-xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proposal.mediaUrl}
                alt={proposal.title}
                className="h-64 w-full object-cover"
              />
            </div>
          )}

          {/* Purpose & Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Purpose & Learning Outcomes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {proposal.objectives || "No specific learning objectives listed."}
                </p>
              </div>

              {proposal.targetAudience && (
                <div className="pt-3 border-t">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target Audience:
                  </span>
                  <p className="mt-1 font-medium text-foreground">{proposal.targetAudience}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description & Syllabus */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Detailed Description & Curriculum
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {proposal.description}
            </CardContent>
          </Card>

          {/* Review History */}
          {(proposal.reviewFeedback || proposal.reviewer) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reviewer Evaluation</CardTitle>
                <CardDescription>
                  Copyright, compliance, and academic evaluation trail.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  {proposal.reviewer && (
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={proposal.reviewer.name}
                        image={proposal.reviewer.image}
                        className="size-7"
                      />
                      <div>
                        <p className="font-medium">{proposal.reviewer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {proposal.reviewedAt ? format(proposal.reviewedAt, "d MMM yyyy, h:mm a") : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {proposal.reviewRating && (
                    <div className="text-amber-500 font-semibold text-sm">
                      {"★".repeat(proposal.reviewRating)}
                      <span className="text-muted-foreground/30">
                        {"★".repeat(5 - proposal.reviewRating)}
                      </span>
                    </div>
                  )}
                </div>

                {proposal.reviewFeedback && (
                  <p className="rounded-lg bg-muted/60 p-3 italic text-foreground">
                    &ldquo;{proposal.reviewFeedback}&rdquo;
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Assigned Review Authority Card */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Assigned Review Authority</span>
                <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Lead Mentor
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={proposal.teacher?.name || proposal.teacherName || proposal.createdBy.name}
                  image={proposal.teacher?.image || proposal.createdBy.image}
                  className="size-10 ring-2 ring-primary/20"
                />
                <div>
                  <p className="font-bold text-sm text-foreground">
                    {proposal.teacher?.name || proposal.teacherName || proposal.createdBy.name}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {proposal.teacher?.email || "Assigned Mentor & Review Authority"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-2.5 space-y-1">
                <p className="font-semibold text-foreground">
                  {proposal.status === "APPROVED" || proposal.status === "CONVERTED"
                    ? "Verdict: Reviewed & Approved"
                    : proposal.status === "SUBMITTED" || proposal.status === "UNDER_REVIEW"
                    ? "Status: Awaiting Mentor Review"
                    : "Status: Draft (Pending Submission)"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {proposal.status === "APPROVED" || proposal.status === "CONVERTED"
                    ? `Approved by ${proposal.reviewer?.name || proposal.teacher?.name || "Assigned Mentor"}`
                    : `This event is assigned to ${
                        proposal.teacher?.name || proposal.teacherName || "assigned mentor"
                      } for review and approval.`}
                </p>
              </div>

              {canReview && (proposal.status === "SUBMITTED" || proposal.status === "UNDER_REVIEW") && (
                <ProposalReviewDialog
                  proposalId={proposal.id}
                  proposalTitle={proposal.title}
                  trigger={
                    <Button className="w-full font-semibold shadow-sm" size="sm">
                      <CheckCircle2 className="size-4 mr-1.5" /> Review & Decide Now
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Specifications Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Dates & Duration</p>
                  <p className="text-xs text-muted-foreground">
                    {proposal.startDate
                      ? `${format(proposal.startDate, "d MMM yyyy")} ${
                          proposal.endDate && proposal.endDate.getTime() !== proposal.startDate.getTime()
                            ? `– ${format(proposal.endDate, "d MMM yyyy")}`
                            : ""
                        }`
                      : "Date to be announced"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Schedule Breakdown</p>
                  <p className="text-xs text-muted-foreground">
                    {PROPOSAL_SCHEDULE_LABELS[proposal.scheduleType]}
                    {proposal.dailyHours ? ` · ${proposal.dailyHours} hrs/day` : ""}
                    {proposal.totalHours ? ` (${proposal.totalHours} total hrs)` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-xs text-muted-foreground">
                    {PROPOSAL_LOCATION_LABELS[proposal.locationType]}
                    {proposal.locationName ? ` — ${proposal.locationName}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Instructor / Speaker</p>
                  <p className="text-xs text-muted-foreground">{teacherDisplay}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Capacity</p>
                  <p className="text-xs text-muted-foreground">
                    {proposal.capacity ? `${proposal.capacity} participants maximum` : "Unlimited capacity"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Pricing & Budget</p>
                  <p className="text-xs text-muted-foreground">
                    Ticket: {proposal.pricing ? `$${proposal.pricing}` : "Free"}
                    {proposal.budget ? ` · Estimated budget: $${proposal.budget}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Company Division</p>
                  <p className="text-xs text-muted-foreground">{proposal.company.name}</p>
                </div>
              </div>

              {proposal.documentUrl && (
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
                    <a href={proposal.documentUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" /> Open Attached Document
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
