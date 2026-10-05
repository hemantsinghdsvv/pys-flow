"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ListChecks,
  Search,
  Zap,
  ArrowUp,
  Minus,
  ArrowDown,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";

export interface TaskListItem {
  id: string;
  title: string;
  description?: string | null;
  projectName: string;
  status: "PENDING" | "REVIEW" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeName?: string | null;
  assigneeImage?: string | null;
  assigneeDesignation?: string | null;
  deadline?: string | null;
  estimatedHours?: number | null;
}

const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", badgeClass: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300", icon: Zap },
  HIGH: { label: "High", badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300", icon: ArrowUp },
  MEDIUM: { label: "Medium", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300", icon: Minus },
  LOW: { label: "Low", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300", icon: ArrowDown },
};

const STATUS_CONFIG = {
  PENDING: { label: "Pending", badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300" },
  REVIEW: { label: "In Progress", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300" },
  COMPLETED: { label: "Completed", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300" },
  CANCELLED: { label: "Cancelled", badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300" },
};

export function TasksListView({ tasks }: { tasks: TaskListItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.assigneeName && task.assigneeName.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;
      if (statusFilter === "overdue") {
        const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED";
        if (!isOverdue) return false;
      } else if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  return (
    <div className="bg-card rounded-xl shadow-xs border border-border p-4 sm:p-5 space-y-4">
      {/* Header + Filters */}
      <div className="flex flex-col gap-3">
        <h3 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
          <ListChecks className="size-4 text-[#00381F] dark:text-[#D9AE29]" />
          Task List
          <span className="text-xs text-muted-foreground font-normal font-sans ml-1">
            ({filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"})
          </span>
        </h3>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <div className="relative flex-1 min-w-0 sm:max-w-48">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-8 pl-8 pr-2 w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none text-xs h-8 px-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#00381F]"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEW">In Progress</option>
              <option value="overdue">⚠️ Overdue</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex-1 sm:flex-none text-xs h-8 px-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#00381F]"
            >
              <option value="all">All Priority</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Mobile Card View ── */}
      <div className="md:hidden space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No matching tasks found.</div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED";
            const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
            const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
            const PIcon = pc.icon;
            return (
              <div key={task.id} className="border border-border rounded-xl p-3.5 bg-card space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground text-sm leading-snug flex-1">{task.title}</p>
                  <Link href={`/tasks/${task.id}`}>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0">
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                {task.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${pc.badgeClass}`}>
                    <PIcon className="size-3" />{pc.label}
                  </span>
                  <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badgeClass}`}>
                    {sc.label}
                  </span>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold border border-rose-200">
                      <AlertTriangle className="size-3" /> Overdue
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                  <div><span className="font-medium text-foreground">Project: </span>{task.projectName}</div>
                  {task.deadline && (
                    <div className={isOverdue ? "text-rose-600 font-semibold" : ""}>
                      <span className="font-medium text-foreground">Due: </span>
                      {format(new Date(task.deadline), "d MMM yy")}
                    </div>
                  )}
                  {task.assigneeName && (
                    <div className="col-span-2 flex items-center gap-1.5 pt-1">
                      <UserAvatar name={task.assigneeName} image={task.assigneeImage} className="size-5 text-[9px]" />
                      <span className="font-medium text-foreground">{task.assigneeName}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop Table ── */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-3.5 py-3 text-left">Task</th>
              <th className="px-3.5 py-3 text-left">Project</th>
              <th className="px-3.5 py-3 text-left">Priority</th>
              <th className="px-3.5 py-3 text-left">Status</th>
              <th className="px-3.5 py-3 text-left">Assignee</th>
              <th className="px-3.5 py-3 text-left">Deadline</th>
              <th className="px-3.5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTasks.map((task) => {
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED";
              const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
              const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              const PIcon = pc.icon;
              return (
                <tr key={task.id} className="hover:bg-muted/30 transition group">
                  <td className="px-3.5 py-3 max-w-xs">
                    <div className="font-semibold text-foreground text-xs leading-snug">{task.title}</div>
                    {task.description && <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{task.description}</div>}
                    {task.estimatedHours != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono mt-1">⏱️ {task.estimatedHours}h est.</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-xs">
                    <span className="inline-block px-2 py-0.5 rounded bg-muted text-foreground text-[11px] font-medium max-w-[140px] truncate">
                      {task.projectName}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-xs">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${pc.badgeClass}`}>
                      <PIcon className="size-3" />{pc.label}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-xs">
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badgeClass}`}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-xs">
                    {task.assigneeName ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={task.assigneeName} image={task.assigneeImage} className="size-6 text-[10px]" />
                        <div>
                          <div className="font-medium text-xs text-foreground">{task.assigneeName}</div>
                          {task.assigneeDesignation && <div className="text-[10px] text-muted-foreground">{task.assigneeDesignation}</div>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-xs">
                    {task.deadline ? (
                      <div className={`flex items-center gap-1 ${isOverdue ? "text-rose-600 font-bold" : "text-muted-foreground font-medium"}`}>
                        {isOverdue && <AlertTriangle className="size-3.5 shrink-0" />}
                        <span>{format(new Date(task.deadline), "MMM d, yyyy")}</span>
                        {isOverdue && (
                          <span className="text-[9px] px-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 uppercase">Overdue</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild className="size-7 p-0 text-muted-foreground hover:text-foreground">
                      <Link href={`/tasks/${task.id}`} title="View task"><ExternalLink className="size-3.5" /></Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filteredTasks.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">No matching tasks found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
