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
  Clock,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  URGENT: {
    label: "Urgent",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300",
    icon: Zap,
  },
  HIGH: {
    label: "High",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300",
    icon: ArrowUp,
  },
  MEDIUM: {
    label: "Medium",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300",
    icon: Minus,
  },
  LOW: {
    label: "Low",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
    icon: ArrowDown,
  },
};

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300",
  },
  REVIEW: {
    label: "In Progress",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300",
  },
};

export function TasksListView({ tasks }: { tasks: TaskListItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.assigneeName &&
          task.assigneeName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === "overdue") {
        const isOverdue =
          task.deadline &&
          new Date(task.deadline) < new Date() &&
          task.status !== "COMPLETED";
        if (!isOverdue) return false;
      } else if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  return (
    <div className="bg-card rounded-xl shadow-xs border border-border p-5 space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
          <ListChecks className="size-4.5 text-[#00381F] dark:text-[#D9AE29]" />
          Task List
          <span className="text-xs text-muted-foreground font-normal font-sans ml-1">
            ({filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"})
          </span>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-8 pl-8 pr-2 w-full"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs h-8 px-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#00381F]"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEW">In Progress / Review</option>
            <option value="overdue">⚠️ Overdue Only</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs h-8 px-2.5 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#00381F]"
          >
            <option value="all">All Priority</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-3.5 py-3 text-left">Task</th>
              <th className="px-3.5 py-3 text-left">Project</th>
              <th className="px-3.5 py-3 text-left">Priority</th>
              <th className="px-3.5 py-3 text-left">Status</th>
              <th className="px-3.5 py-3 text-left">Assignee</th>
              <th className="px-3.5 py-3 text-left">Timeline / Deadline</th>
              <th className="px-3.5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTasks.map((task) => {
              const isOverdue =
                task.deadline &&
                new Date(task.deadline) < new Date() &&
                task.status !== "COMPLETED";
              const priorityConfig =
                PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
              const statusConfig =
                STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
              const PriorityIcon = priorityConfig.icon;

              return (
                <tr
                  key={task.id}
                  className="hover:bg-muted/30 transition group"
                >
                  <td className="px-3.5 py-3 max-w-xs">
                    <div className="font-semibold text-foreground text-xs leading-snug">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                      </div>
                    )}
                    {task.estimatedHours != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono mt-1">
                        ⏱️ {task.estimatedHours}h est.
                      </span>
                    )}
                  </td>

                  <td className="px-3.5 py-3 text-xs">
                    <span className="inline-block px-2 py-0.5 rounded bg-muted text-foreground text-[11px] font-medium max-w-[140px] truncate">
                      {task.projectName}
                    </span>
                  </td>

                  <td className="px-3.5 py-3 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${priorityConfig.badgeClass}`}
                    >
                      <PriorityIcon className="size-3" />
                      {priorityConfig.label}
                    </span>
                  </td>

                  <td className="px-3.5 py-3 text-xs">
                    <span
                      className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                  </td>

                  <td className="px-3.5 py-3 text-xs">
                    {task.assigneeName ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={task.assigneeName}
                          image={task.assigneeImage}
                          className="size-6 text-[10px]"
                        />
                        <div>
                          <div className="font-medium text-xs text-foreground">
                            {task.assigneeName}
                          </div>
                          {task.assigneeDesignation && (
                            <div className="text-[10px] text-muted-foreground">
                              {task.assigneeDesignation}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td className="px-3.5 py-3 text-xs">
                    {task.deadline ? (
                      <div
                        className={`flex items-center gap-1 ${
                          isOverdue
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-muted-foreground font-medium"
                        }`}
                      >
                        {isOverdue && <AlertTriangle className="size-3.5 shrink-0" />}
                        <span>{format(new Date(task.deadline), "MMM d, yyyy")}</span>
                        {isOverdue && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 uppercase">
                            Overdue
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>

                  <td className="px-3.5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="size-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/tasks/${task.id}`} title="View task">
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}

            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">
                  No matching tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
