import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityLogView, type ActivityItem } from "@/features/activity/components/activity-log-view";

export const metadata: Metadata = { title: "Activity Log - Pragya Yog School" };

export default async function ActivityLogPage() {
  const user = await requireUser();
  const canAccess =
    user.isSystemAdmin ||
    (user.hierarchyLevel ?? 4) <= 3 ||
    can(user, "feature:activity") ||
    can(user, "feature:settings");

  if (!canAccess) {
    redirect("/dashboard");
  }

  const [logs, studios] = await Promise.all([
    prisma.activityLog.findMany({
      take: 250,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            designation: true,
            orgRole: {
              select: {
                name: true,
                hierarchyLevel: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedLogs: ActivityItem[] = logs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityName: l.entityName,
    entityId: l.entityId,
    details: l.details,
    createdAt: l.createdAt.toISOString(),
    user: {
      id: l.user.id,
      name: l.user.name,
      email: l.user.email,
      image: l.user.image,
      designation: l.user.designation,
      orgRole: l.user.orgRole,
    },
    company: l.company ? { id: l.company.id, name: l.company.name } : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log & Operations Audit"
        description="Comprehensive audit trail of tasks, proposals, role modifications, studio operations, and reviews across Pragya Yog School."
      />
      <ActivityLogView logs={serializedLogs} studios={studios} />
    </div>
  );
}
