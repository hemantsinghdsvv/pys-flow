import { FileSpreadsheet, Clock, CheckCircle2, ArrowRightCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

export function ProposalStats({
  stats,
}: {
  stats: {
    total: number;
    inReview: number;
    approved: number;
    converted: number;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Proposals"
        value={stats.total}
        hint="All recorded event & track proposals"
        icon={FileSpreadsheet}
      />
      <StatCard
        title="In Review"
        value={stats.inReview}
        hint="Awaiting coordinator & copyright review"
        icon={Clock}
      />
      <StatCard
        title="Approved"
        value={stats.approved}
        hint="Ready for project & task provisioning"
        icon={CheckCircle2}
      />
      <StatCard
        title="Converted to Kanban"
        value={stats.converted}
        hint="Active in production pipelines"
        icon={ArrowRightCircle}
      />
    </div>
  );
}

