import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { InsightsPanel } from "@/features/ai/components/insights-panel";

export const metadata: Metadata = { title: "AI Insights" };

export default async function AiInsightsPage() {
  const user = await requireUser();
  if (!can(user, "feature:ai") || !can(user, "analytics:read")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="Automated program-health analysis with actionable recommendations."
      />
      <InsightsPanel />
    </div>
  );
}
