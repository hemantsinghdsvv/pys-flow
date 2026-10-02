"use client";

import Link from "next/link";
import { FolderGit2, Calendar, CheckCircle, Clock, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";

export interface ProjectShowcaseItem {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  taskCount: number;
  completedTaskCount: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  ACTIVE: {
    label: "Active",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
  },
  PLANNING: {
    label: "Planning",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300",
  },
  ON_HOLD: {
    label: "On Hold",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300",
  },
};

export function ProjectsShowcase({
  projects,
  canCreate = true,
}: {
  projects: ProjectShowcaseItem[];
  canCreate?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl shadow-xs border border-border p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
            <FolderGit2 className="size-4.5 text-[#00381F] dark:text-[#D9AE29]" />
            Active Projects & Operational Initiatives
            <span className="text-xs text-muted-foreground font-normal font-sans ml-1">
              ({projects.length} Initiatives)
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Overview of school programs & operations timelines
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild className="h-8 text-xs">
            <Link href="/projects" className="flex items-center gap-1">
              <span>View All Projects</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
          {canCreate && (
            <CreateProjectModal
              trigger={
                <Button size="sm" className="h-8 text-xs bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1 shadow-xs">
                  <Plus className="size-3.5" />
                  <span>Add Project</span>
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {projects.map((project) => {
          const progress =
            project.taskCount > 0
              ? Math.round((project.completedTaskCount / project.taskCount) * 100)
              : 0;
          const statusConfig = STATUS_CONFIG[project.status] || {
            label: project.status,
            badgeClass: "bg-slate-100 text-slate-700",
          };

          return (
            <div
              key={project.id}
              className="bg-muted/30 hover:bg-muted/50 rounded-xl p-4 border border-border transition hover:translate-y-[-2px] hover:shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-foreground leading-snug">
                    {project.name}
                  </h4>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.2 font-medium ${statusConfig.badgeClass}`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-md bg-card border border-border text-foreground shrink-0">
                  {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
                </span>
              </div>

              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground">Progress</span>
                  <span className="text-[11px] font-bold text-[#00381F] dark:text-[#D9AE29]">
                    {progress}% ({project.completedTaskCount}/{project.taskCount} done)
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#00381F] dark:bg-[#D9AE29] h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Timeline Footer */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>
                    {project.startDate
                      ? format(new Date(project.startDate), "MMM d, yyyy")
                      : "Ongoing"}{" "}
                    —{" "}
                    {project.endDate
                      ? format(new Date(project.endDate), "MMM d, yyyy")
                      : "No deadline"}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-foreground">
                  Pragya Operations
                </span>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="col-span-2 text-center text-muted-foreground py-8">
            No projects available
          </div>
        )}
      </div>
    </div>
  );
}
