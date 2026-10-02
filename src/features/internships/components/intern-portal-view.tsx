"use client";

import React, { useState } from "react";
import { 
  Award, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  FastForward, 
  Info, 
  Filter, 
  Check,
  ChevronRight
} from "lucide-react";
import { 
  CurriculumMonth, 
  InternshipPlannerState, 
  CurriculumTask, 
  InternPortalGrouping, 
  InternPortalFilter,
  InternMember 
} from "../types";
import { WEEK_INDEX_MAP } from "../constants";

interface InternPortalViewProps {
  plan: CurriculumMonth[];
  state: InternshipPlannerState;
  activeIntern: InternMember;
  onToggleTask: (taskId: string) => void;
  onSelectIntern?: (internId: string) => void;
  showInternPicker?: boolean;
}

export function InternPortalView({
  plan,
  state,
  activeIntern,
  onToggleTask,
  onSelectIntern,
  showInternPicker = true,
}: InternPortalViewProps) {
  const [filter, setFilter] = useState<InternPortalFilter>("all");
  const [grouping, setGrouping] = useState<InternPortalGrouping>("month");
  const [selectedType, setSelectedType] = useState<string>("");

  const typeMap = new Map(state.roster.types.map((t) => [t.id, t]));
  const staffMap = new Map(state.roster.staff.map((s) => [s.id, s]));

  const todayStr = new Date().toISOString().split("T")[0];

  function getDefaultDateForWeek(weekId: string) {
    const idx = WEEK_INDEX_MAP[weekId];
    if (idx === undefined) return "";
    const base = new Date((state.planStart || todayStr) + "T00:00:00");
    if (isNaN(base.getTime())) return "";
    base.setDate(base.getDate() + idx * 7);
    return base.toISOString().split("T")[0];
  }

  // Get all tasks applicable to this intern
  const internTasks: (CurriculumTask & { monthTitle: string; weekTitle: string; weekFocus: string })[] = [];

  plan.forEach((month) => {
    month.weeks.forEach((week) => {
      const weekDefaultDate = getDefaultDateForWeek(week.id);

      // Default tasks
      week.tasks.forEach((text, i) => {
        const id = `${week.id}-d${i}`;
        if (state.removed[id]) return;
        const e = state.edits[id] || {};
        const internIds = e.internIds || [];
        // If empty, assigned to all interns (batch); else check inclusion
        if (internIds.length > 0 && !internIds.includes(activeIntern.id)) return;

        internTasks.push({
          id,
          weekId: week.id,
          monthTitle: month.title,
          weekTitle: week.title,
          weekFocus: week.focus,
          text: e.text !== undefined ? e.text : text,
          typeId: e.typeId || "",
          scheduledDate: e.scheduledDate || weekDefaultDate,
          scheduledTime: e.scheduledTime || "",
          marks: e.marks !== undefined ? e.marks : null,
          markedBy: e.markedBy || "",
          internIds,
          staffId: e.staffId || "",
          done: !!state.done[id],
        });
      });

      // Custom tasks
      (state.custom[week.id] || []).forEach((c, i) => {
        const id = (c as any).id || `${week.id}-c${i}`;
        if (state.removed[id]) return;
        const internIds = c.internIds || [];
        if (internIds.length > 0 && !internIds.includes(activeIntern.id)) return;

        internTasks.push({
          id,
          weekId: week.id,
          monthTitle: month.title,
          weekTitle: week.title,
          weekFocus: week.focus,
          text: c.text || "Custom Task",
          typeId: c.typeId || "",
          scheduledDate: c.scheduledDate || weekDefaultDate,
          scheduledTime: c.scheduledTime || "",
          marks: c.marks !== undefined ? c.marks : null,
          markedBy: c.markedBy || "",
          internIds,
          staffId: c.staffId || "",
          done: !!state.done[id],
          custom: true,
        });
      });
    });
  });

  // Calculate statistics
  const totalTasks = internTasks.length;
  const completedTasks = internTasks.filter((t) => t.done).length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = internTasks.filter(
    (t) => !t.done && t.scheduledDate && t.scheduledDate < todayStr
  ).length;
  const batchTasksCount = internTasks.filter((t) => t.internIds.length === 0 || t.internIds.length > 1).length;
  const indivTasksCount = internTasks.filter((t) => t.internIds.length === 1).length;

  const marksAwarded = internTasks.reduce((acc, t) => acc + (t.marks || 0), 0);
  const maxPossibleMarks = totalTasks * 10;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Next Up Task: Earliest pending or overdue task
  const nextUpTask = internTasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""))[0];

  // Filter tasks based on selected filter chips
  const filteredTasks = internTasks.filter((t) => {
    if (selectedType && t.typeId !== selectedType) return false;

    const isBatch = t.internIds.length === 0 || t.internIds.length > 1;
    const isOverdue = !t.done && t.scheduledDate && t.scheduledDate < todayStr;

    if (filter === "batch" && !isBatch) return false;
    if (filter === "individual" && isBatch) return false;
    if (filter === "pending" && t.done) return false;
    if (filter === "done" && !t.done) return false;
    if (filter === "overdue" && !isOverdue) return false;

    return true;
  });

  const initials = activeIntern.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* ── 1. Intern App Bar ── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-full bg-linear-to-br from-amber-600 to-amber-500 text-white font-serif font-bold text-sm grid place-items-center shadow-xs">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-foreground">
                {activeIntern.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300">
                {activeIntern.batch ? `Batch ${activeIntern.batch}` : "Yoga TTC Intern"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Yoga TTC Curriculum & Practical Milestone Portfolio
            </p>
          </div>
        </div>

        {showInternPicker && onSelectIntern && state.roster.interns.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Switch Intern:</span>
            <select
              value={activeIntern.id}
              onChange={(e) => onSelectIntern(e.target.value)}
              className="text-xs p-2 rounded-xl border border-border bg-background font-semibold focus:outline-none focus:border-amber-500"
            >
              {state.roster.interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── 2. Hero Card (Marks Score & Stats) ── */}
      <section className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Practical & Theory Marks
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-serif font-bold text-purple-700 dark:text-purple-300">
                {marksAwarded}
              </span>
              <span className="text-lg font-bold text-purple-400 dark:text-purple-500">
                / {maxPossibleMarks}
              </span>
              <span className="text-xs font-semibold text-muted-foreground ml-2">
                ({maxPossibleMarks > 0 ? Math.round((marksAwarded / maxPossibleMarks) * 100) : 0}% aggregate)
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-500">
              {progressPct}%
            </span>
            <span className="text-xs text-muted-foreground block">
              {completedTasks} of {totalTasks} milestones completed
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-amber-600 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* 4 KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 border border-border rounded-xl bg-muted/20">
            <div className="text-xl font-bold font-serif text-emerald-600">{completedTasks}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
              Completed
            </div>
          </div>
          <div className="p-3.5 border border-border rounded-xl bg-muted/20">
            <div className="text-xl font-bold font-serif text-amber-600">{pendingTasks}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
              Pending
            </div>
          </div>
          <div className="p-3.5 border border-border rounded-xl bg-muted/20">
            <div className="text-xl font-bold font-serif text-red-600">{overdueTasks}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
              Overdue
            </div>
          </div>
          <div className="p-3.5 border border-border rounded-xl bg-muted/20">
            <div className="text-xl font-bold font-serif text-indigo-600">{batchTasksCount}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
              Batch Tasks
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Next Up Milestone Card ── */}
      {nextUpTask && (
        <section className="bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="size-11 rounded-xl bg-background border border-amber-500/30 text-amber-600 grid place-items-center shadow-xs shrink-0 text-lg">
              ⏭️
            </div>
            <div className="min-w-0 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Next Milestone Up
              </span>
              <h4 className="font-semibold text-sm text-foreground leading-snug">
                {nextUpTask.text}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                <span className="font-medium text-foreground">{nextUpTask.weekTitle}</span>
                <span>·</span>
                {nextUpTask.scheduledDate && (
                  <span className="font-medium">📅 {nextUpTask.scheduledDate}</span>
                )}
                {staffMap.get(nextUpTask.staffId) && (
                  <span>· Checker: {staffMap.get(nextUpTask.staffId)?.name}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleTask(nextUpTask.id)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition shrink-0"
          >
            Mark Done
          </button>
        </section>
      )}

      {/* ── 4. Toolbar: Filters & View Switcher ── */}
      <section className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        {/* Row 1: Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
            Filter:
          </span>
          {[
            { key: "all", label: "All", count: totalTasks },
            { key: "batch", label: "🏫 Batch", count: batchTasksCount },
            { key: "individual", label: "👤 Individual", count: indivTasksCount },
            { key: "pending", label: "Pending", count: pendingTasks },
            { key: "done", label: "Completed", count: completedTasks },
            { key: "overdue", label: "Overdue", count: overdueTasks },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key as InternPortalFilter)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                filter === item.key
                  ? "bg-amber-600 border-amber-600 text-white shadow-2xs"
                  : "bg-muted/40 border-border text-muted-foreground hover:border-amber-500/50 hover:text-foreground"
              }`}
            >
              {item.label}{" "}
              <span className="text-[10px] opacity-80 ml-1">({item.count})</span>
            </button>
          ))}
        </div>

        {/* Row 2: Grouping & Task Type */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Group By:
            </span>
            <div className="inline-flex bg-muted p-0.5 rounded-lg text-xs font-semibold">
              {(["month", "week", "flat"] as InternPortalGrouping[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrouping(g)}
                  className={`px-2.5 py-1 rounded-md transition capitalize ${
                    grouping === g ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-border bg-background focus:outline-none focus:border-amber-500"
            >
              <option value="">All Task Types</option>
              {state.roster.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── 5. Notice Banner ── */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
        <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">How grading works:</span> each curriculum task is worth{" "}
          <span className="font-bold">10 marks</span>. Complete milestones and your faculty checker will verify and award marks.
        </div>
      </div>

      {/* ── 6. Task List ── */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-2xl text-muted-foreground text-xs">
            No milestones match your selected filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const typeObj = typeMap.get(task.typeId);
            const staffObj = staffMap.get(task.staffId);
            const isOverdue = !task.done && task.scheduledDate && task.scheduledDate < todayStr;
            const isBatch = task.internIds.length === 0 || task.internIds.length > 1;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition bg-card flex items-start gap-3.5 shadow-2xs hover:border-amber-500/40 ${
                  task.done
                    ? "bg-muted/30 border-transparent opacity-85"
                    : isOverdue
                    ? "border-red-200 dark:border-red-900/40 bg-red-50/20"
                    : isBatch
                    ? "border-l-4 border-l-indigo-500"
                    : "border-l-4 border-l-cyan-500"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="mt-0.5 text-muted-foreground hover:text-amber-600 shrink-0 transition"
                >
                  {task.done ? (
                    <CheckCircle2 className="size-5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                  ) : (
                    <Circle className="size-5 text-muted-foreground hover:text-amber-600" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div
                    onClick={() => onToggleTask(task.id)}
                    className={`text-sm font-medium leading-relaxed cursor-pointer ${
                      task.done ? "line-through text-muted-foreground" : "text-foreground font-semibold"
                    }`}
                  >
                    {task.text}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Batch / Individual Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isBatch
                          ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300"
                          : "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900 text-cyan-700 dark:text-cyan-300"
                      }`}
                    >
                      {isBatch ? "🏫 Batch Task" : "👤 Individual"}
                    </span>

                    {/* Week Tag */}
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {task.weekTitle}
                    </span>

                    {/* Task Type Badge */}
                    {typeObj && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: typeObj.color }}
                      >
                        {typeObj.name}
                      </span>
                    )}

                    {/* Date / Overdue Badge */}
                    {task.scheduledDate && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOverdue
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        📅 {task.scheduledDate}
                      </span>
                    )}

                    {/* Staff Checker Badge */}
                    {staffObj && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300">
                        ✓ {staffObj.name}
                      </span>
                    )}

                    {/* Marks Badge */}
                    {task.marks !== null ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          task.marks === 10
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
                        }`}
                      >
                        🎖️ {task.marks} / 10 marks
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-dashed border-amber-300 px-2 py-0.5 rounded-full">
                        ⏳ Marks pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
