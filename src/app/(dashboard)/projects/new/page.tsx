import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { YogaProjectForm } from "@/features/projects/components/yoga-project-form";

export const metadata: Metadata = { title: "New Project - Pragya Yog School" };

export default async function NewProjectPage() {
  const user = await requireUser();
  const canCreate =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "project:create");

  if (!canCreate) {
    redirect("/projects");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Create New Operational Initiative"
        description="Launch and structure a new yoga program, teacher training batch, or school project."
      />
      <YogaProjectForm />
    </div>
  );
}
