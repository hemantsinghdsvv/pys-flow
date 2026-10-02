import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Compass, Sparkles, Inbox, CalendarDays } from "lucide-react";
import type { ProposalType } from "@prisma/client";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalStats } from "@/features/propose/components/proposal-stats";
import { ProposalCard, type ProposalWithRelations } from "@/features/propose/components/proposal-card";

export const metadata: Metadata = { title: "Proposals" };

export default async function ProposePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "feature:propose") && !can(user, "proposal:read")) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);
  const { type: typeFilter, q } = await searchParams;

  const proposals = await prisma.proposal.findMany({
    where: {
      ...scope,
      deletedAt: null,
      ...(user.role === "INTERN"
        ? { OR: [{ createdById: user.id }, { status: { in: ["APPROVED", "CONVERTED"] } }] }
        : {}),
      ...(typeFilter ? { type: typeFilter as ProposalType } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { objectives: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      teacher: { select: { id: true, name: true, image: true } },
      reviewer: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: proposals.length,
    inReview: proposals.filter((p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW").length,
    approved: proposals.filter((p) => p.status === "APPROVED").length,
    converted: proposals.filter((p) => p.status === "CONVERTED").length,
  };

  const pendingProposals = proposals.filter(
    (p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW"
  );
  const approvedProposals = proposals.filter(
    (p) => p.status === "APPROVED" || p.status === "CONVERTED"
  );
  const draftProposals = proposals.filter((p) => p.status === "DRAFT");
  const reworkProposals = proposals.filter(
    (p) => p.status === "REWORK" || p.status === "REJECTED"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals & Event Pipeline"
        description="Initiate, review, and promote workshops, retreats, and initiatives into active Kanban workflows."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/calendar">
                <CalendarDays className="size-4" /> Event Calendar
              </Link>
            </Button>
            <Button asChild>
              <Link href="/propose/new">
                <Plus className="size-4" /> Add Events
              </Link>
            </Button>
          </div>
        }
      />

      <ProposalStats stats={stats} />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto p-1">
          <TabsTrigger value="all">All Proposals ({proposals.length})</TabsTrigger>
          <TabsTrigger value="pending">In Review ({pendingProposals.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved & Converted ({approvedProposals.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftProposals.length})</TabsTrigger>
          {reworkProposals.length > 0 && (
            <TabsTrigger value="rework">Rework / Rejected ({reworkProposals.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all">
          {proposals.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No proposals found"
              description="Start by creating an event, workshop, or project proposal to initiate the workflow."
              action={
                <Button asChild>
                  <Link href="/propose/new">
                    <Plus className="size-4" /> Add Events
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {proposals.map((p) => (
                <ProposalCard key={p.id} proposal={p as unknown as ProposalWithRelations} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingProposals.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No proposals awaiting review"
              description="Proposals submitted by instructors or team members will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingProposals.map((p) => (
                <ProposalCard key={p.id} proposal={p as unknown as ProposalWithRelations} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedProposals.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No approved proposals yet"
              description="Approved proposals ready for project conversion will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {approvedProposals.map((p) => (
                <ProposalCard key={p.id} proposal={p as unknown as ProposalWithRelations} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts">
          {draftProposals.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No draft proposals"
              description="Proposals you save as drafts before submitting will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {draftProposals.map((p) => (
                <ProposalCard key={p.id} proposal={p as unknown as ProposalWithRelations} />
              ))}
            </div>
          )}
        </TabsContent>

        {reworkProposals.length > 0 && (
          <TabsContent value="rework">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reworkProposals.map((p) => (
                <ProposalCard key={p.id} proposal={p as unknown as ProposalWithRelations} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
