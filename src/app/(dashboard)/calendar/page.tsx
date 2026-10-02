import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Compass } from "lucide-react";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EventCalendar, type CalendarEventItem } from "@/features/calendar/components/event-calendar";

export const metadata: Metadata = { title: "Event Calendar" };

export default async function CalendarPage() {
  const user = await requireUser();
  if (!can(user, "feature:calendar")) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);

  // Fetch real-time live Proposals and standalone Projects with dates
  const [proposals, projects] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        ...scope,
        deletedAt: null,
        ...(user.role === "INTERN"
          ? { OR: [{ createdById: user.id }, { status: { in: ["APPROVED", "CONVERTED"] } }] }
          : {}),
      },
      include: {
        company: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.project.findMany({
      where: {
        ...scope,
        deletedAt: null,
        startDate: { not: null },
        proposals: { none: {} },
      },
      include: {
        company: { select: { name: true } },
        mentors: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const proposalEvents: CalendarEventItem[] = proposals.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    scheduleType: p.scheduleType,
    locationType: p.locationType,
    locationName: p.locationName,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    dailyHours: p.dailyHours,
    totalHours: p.totalHours,
    capacity: p.capacity,
    teacherName: p.teacherName,
    pricing: p.pricing,
    budget: p.budget,
    description: p.description,
    objectives: p.objectives,
    targetAudience: p.targetAudience,
    status: p.status,
    companyName: p.company?.name,
    projectId: p.projectId,
  }));

  const projectEvents: CalendarEventItem[] = projects.map((pr) => ({
    id: pr.id,
    title: pr.name,
    type: "PROJECT" as const,
    scheduleType: "MULTI_DAY",
    locationType: "STUDIO" as const,
    locationName: pr.company?.name || "Company Workspace",
    startDate: pr.startDate?.toISOString() ?? null,
    endDate: pr.endDate?.toISOString() ?? null,
    dailyHours: 6,
    totalHours: 24,
    capacity: 10,
    teacherName: pr.mentors[0]?.user?.name || "Lead Mentor",
    pricing: 0,
    budget: 0,
    description: pr.description || "",
    objectives: pr.objective || "",
    targetAudience: "Engineering Team",
    status: "CONVERTED" as const,
    companyName: pr.company?.name,
    projectId: pr.id,
  }));

  const combinedEvents: CalendarEventItem[] = [...proposalEvents, ...projectEvents].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const canCreate = user.role !== "INTERN";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Calendar"
        description="Real-time live schedule of all proposed, approved, and active workshops, retreats, and production events."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/propose">
                <Compass className="size-4" /> All Proposals
              </Link>
            </Button>
            {canCreate && (
              <Button asChild>
                <Link href="/propose/new">
                  <Plus className="size-4" /> Propose event
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <EventCalendar events={combinedEvents} />
    </div>
  );
}
