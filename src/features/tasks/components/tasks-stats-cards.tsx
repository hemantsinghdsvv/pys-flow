"use client";

import { CheckSquare, Clock, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TasksStatsCardsProps {
  total: number;
  pending: number;
  inProgress: number;
  overdue: number;
  completed: number;
}

export function TasksStatsCards({
  total,
  pending,
  inProgress,
  overdue,
  completed,
}: TasksStatsCardsProps) {
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    {
      label: "Total Tasks",
      value: total,
      sub: "Active school tasks",
      icon: CheckSquare,
      color: "text-slate-800 dark:text-slate-200",
      bg: "bg-slate-100 dark:bg-slate-800",
      border: "border-border",
    },
    {
      label: "Pending",
      value: pending,
      sub: "Awaiting start / action",
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      border: "border-purple-200 dark:border-purple-900/50",
    },
    {
      label: "In Progress",
      value: inProgress,
      sub: "Active / under review",
      icon: RefreshCw,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      border: "border-blue-200 dark:border-blue-900/50",
    },
    {
      label: "Overdue",
      value: overdue,
      sub: "Past scheduled deadline",
      icon: AlertTriangle,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-rose-200 dark:border-rose-900/50",
    },
    {
      label: "Completed",
      value: completed,
      sub: "Successfully finalized",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-200 dark:border-emerald-900/50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* 5 Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl bg-card border ${stat.border} shadow-xs transition hover:translate-y-[-2px] hover:shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-extrabold text-foreground mt-1">
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {stat.sub}
                  </div>
                </div>
                <div
                  className={`size-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`size-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Progress Banner */}
      <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-foreground">
              Overall Task Progress
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              ({completed} of {total} operational tasks completed)
            </span>
          </div>
          <span className="text-sm font-bold text-[#00381F] dark:text-[#D9AE29]">
            {completionRate}% Complete
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-[#00381F] via-[#0A4A2B] to-[#D9AE29] transition-all duration-700"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
