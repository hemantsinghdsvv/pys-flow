import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  ListTodo,
  NotebookPen,
  FileText,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/access";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reports" };

type Report = {
  type: string;
  title: string;
  description: string;
  icon: LucideIcon;
  fileLabel: string;
};

const REPORTS: Report[] = [
  {
    type: "students",
    title: "Student roster",
    description: "All interns with profile, batch, and skills.",
    icon: GraduationCap,
    fileLabel: "XLSX",
  },
  {
    type: "tasks",
    title: "Task export",
    description: "Every task with project, assignee, status, and deadline.",
    icon: ListTodo,
    fileLabel: "XLSX",
  },
  {
    type: "daily-logs",
    title: "Daily reports",
    description: "Daily work logs with hours and status.",
    icon: NotebookPen,
    fileLabel: "XLSX",
  },
  {
    type: "summary",
    title: "Program summary",
    description: "High-level program metrics as a printable PDF.",
    icon: FileText,
    fileLabel: "PDF",
  },
];

export default async function ReportsPage() {
  const user = await requireUser();
  if (!can(user, "feature:reports") || !can(user, "report:generate")) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Export program data as spreadsheets and PDFs."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Card key={r.type}>
            <CardContent className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.description}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/reports/${r.type}`} download>
                  <Download className="size-4" /> {r.fileLabel}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
