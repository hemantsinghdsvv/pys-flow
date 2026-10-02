import type { Metadata } from "next";
import Link from "next/link";
import { 
  Plus, 
  CalendarDays, 
  Compass, 
  CheckCircle2, 
  Clock, 
  Users, 
  MapPin, 
  Sparkles,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventKanbanBoard } from "@/features/events/components/event-kanban-board";

export const metadata: Metadata = { title: "Events & Workshops - Pragya Yog School" };

export default async function EventsPage() {
  const user = await requireUser();
  const scope = await companyFilter(user);

  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;

  const proposals = await prisma.proposal.findMany({
    where: {
      ...scope,
      deletedAt: null,
    },
    include: {
      createdBy: { select: { id: true, name: true, image: true, designation: true } },
      teacher: { select: { id: true, name: true, image: true, designation: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: proposals.length,
    pendingApproval: proposals.filter((p) => p.status === "SUBMITTED" || p.status === "UNDER_REVIEW" || p.status === "DRAFT").length,
    approved: proposals.filter((p) => p.status === "APPROVED").length,
    converted: proposals.filter((p) => p.status === "CONVERTED").length,
  };

  const serializedEvents = proposals.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    status: p.status,
    scheduleType: p.scheduleType,
    locationType: p.locationType,
    locationName: p.locationName,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    capacity: p.capacity,
    pricing: p.pricing,
    teacherName: p.teacherName || p.teacher?.name || "TBA",
    createdByName: p.createdBy.name,
    createdById: p.createdById,
    description: p.description,
    objectives: p.objectives,
    targetAudience: p.targetAudience,
    reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yoga School Events & Workshops"
        description="Pre-planning Kanban board, teacher event proposals, admin approval workflows, and registration management."
        actions={
          <div className="flex items-center gap-3">
            <Button asChild className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] font-medium shadow-sm">
              <Link href="/propose/new">
                <Plus className="mr-2 size-4 text-[#D9AE29]" />
                Propose New Event
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Metric Highlights ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Total Events</span>
            <CalendarDays className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{stats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">All workshops & retreats</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Pending Approval</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{stats.pendingApproval}</div>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Teacher proposals awaiting Admin</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Approved & Planning</span>
            <CheckCircle2 className="size-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{stats.approved}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">In pre-planning pipeline</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <span>Confirmed / Active</span>
            <Sparkles className="size-4 text-[#D9AE29]" />
          </div>
          <div className="text-2xl font-bold font-serif text-foreground mt-2">{stats.converted}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Open for registration</p>
        </div>
      </div>

      {/* ── Policy Notice ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/30 dark:bg-amber-950/20 text-xs flex items-start gap-3">
        <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Event Approval Policy
          </p>
          <p className="text-amber-800/80 dark:text-amber-300/80">
            {isAdmin 
              ? "As Admin, you can directly approve any event submitted by teachers. Once approved, the event moves to Pre-Planning for studio logistics and attendee registration." 
              : "Events proposed by teachers require Admin approval before marketing and registration can commence."}
          </p>
        </div>
      </div>

      {/* ── Event Preplanning Kanban Board ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif tracking-tight text-foreground flex items-center gap-2">
            <Compass className="size-5 text-[#00381F]" />
            Event Pre-planning Kanban
          </h2>
          <span className="text-xs text-muted-foreground">Drag or click to review & advance status</span>
        </div>
        
        <EventKanbanBoard 
          events={serializedEvents} 
          isAdmin={isAdmin} 
          currentUserId={user.id} 
        />
      </div>
    </div>
  );
}
