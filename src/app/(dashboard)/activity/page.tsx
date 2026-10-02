import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import {
  ActivityTable,
  type ActivityRow,
} from "@/features/activity/components/activity-table";

export const metadata: Metadata = { title: "Activity Log" };

export default async function ActivityPage() {
  const user = await requireUser();
  if (!can(user, "feature:activity") || !can(user, "activity:read")) {
    redirect("/dashboard");
  }

  const scope = await companyFilter(user);

  const logs = await prisma.activityLog.findMany({
    where: { ...scope },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const rows: ActivityRow[] = logs.map((l) => ({
    id: l.id,
    userName: l.user.name,
    userImage: l.user.image,
    action: l.action,
    entityType: l.entityType,
    entityName: l.entityName,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="An audit trail of actions taken across the platform."
      />
      <ActivityTable data={rows} />
    </>
  );
}
