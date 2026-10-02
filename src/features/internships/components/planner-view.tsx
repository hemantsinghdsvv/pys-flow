"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Award, 
  Users, 
  Plus, 
  Edit3, 
  Filter, 
  X,
  AlertCircle
} from "lucide-react";
import { 
  CurriculumTask, 
  CurriculumMonth, 
  CurriculumWeek, 
  RosterState, 
  InternshipPlannerState, 
  TaskEditData 
} from "../types";
import { TaskEditModal } from "./task-edit-modal";
import { WEEK_INDEX_MAP } from "../constants";

interface PlannerViewProps {
  plan: CurriculumMonth[];
  state: InternshipPlannerState;
  onToggleTask: (taskId: string) => void;
  onSaveTask: (taskId: string, data: TaskEditData) => void;
  onAddTask: (weekId: string, text: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function PlannerView({
  plan,
  state,
  onToggleTask,
  onSaveTask,
  onAddTask,
  onDeleteTask,
}: PlannerViewProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filterIntern, setFilterIntern] = useState<string>("");
  const [filterStaff, setFilterStaff] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [editingTask, setEditingTask] = useState<CurriculumTask | null>(null);
  const [newTasks, setNewTasks] = useState<Record<string, string>>({});

  // Helpers
  const typeMap = new Map(state.roster.types.map((t) => [t.id, t]));
  const staffMap = new Map(state.roster.staff.map((s) => [s.id, s]));
  const internMap = new Map(state.roster.interns.map((i) => [i.id, i]));

  const todayStr = new Date().toISOString().split("T")[0];

  function getDefaultDateForWeek(weekId: string) {
    const idx = WEEK_INDEX_MAP[weekId];
    if (idx === undefined) return "";
    const base = new Date((state.planStart || todayStr) + "T00:00:00");
    if (isNaN(base.getTime())) return "";
    base.setDate(base.getDate() + idx * 7);
    return base.toISOString().split("T")[0];
  }

  function getTasksForWeek(week: CurriculumWeek): CurriculumTask[] {
    const defaults = week.tasks
      .map((text, i) => {
        const id = `${week.id}-d${i}`;
        if (state.removed[id]) return null;
        const e = state.edits[id] || {};
        return {
          id,
          weekId: week.id,
          text: e.text !== undefined ? e.text : text,
          typeId: e.typeId || "",
          scheduledDate: e.scheduledDate || "",
          scheduledTime: e.scheduledTime || "",
          marks: e.marks !== undefined ? e.marks : null,
          markedBy: e.markedBy || "",
          internIds: e.internIds || [],
          staffId: e.staffId || "",
          done: !!state.done[id],
          custom: false,
        };
      })
      .filter(Boolean) as CurriculumTask[];

    const customs = (state.custom[week.id] || [])
      .map((c, i) => {
        const id = (c as any).id || `${week.id}-c${i}`;
        if (state.removed[id]) return null;
        return {
          id,
          weekId: week.id,
          text: c.text || "Custom Task",
          typeId: c.typeId || "",
          scheduledDate: c.scheduledDate || "",
          scheduledTime: c.scheduledTime || "",
          marks: c.marks !== undefined ? c.marks : null,
          markedBy: c.markedBy || "",
          internIds: c.internIds || [],
          staffId: c.staffId || "",
          done: !!state.done[id],
          custom: true,
        };
      })
      .filter(Boolean) as CurriculumTask[];

    return [...defaults, ...customs];
  }

  // Flatten all tasks for overall statistics
  const allTasks = plan.flatMap((m) => m.weeks.flatMap((w) => getTasksForWeek(w)));
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.done).length;
  const remainingTasks = totalTasks - completedTasks;
  const overallPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Marks awarded count
  const marksAwardedCount = allTasks.reduce((acc, t) => acc + (t.marks || 0), 0);

  // Filter tasks based on selected filter dropdowns
  function filterTask(t: CurriculumTask) {
    if (filterIntern && !t.internIds.includes(filterIntern)) return false;
    if (filterStaff && t.staffId !== filterStaff) return false;
    if (filterType && t.typeId !== filterType) return false;

    const taskDate = t.scheduledDate || getDefaultDateForWeek(t.weekId);
    const isOverdue = !t.done && taskDate && taskDate < todayStr;
    const isRescheduled = t.scheduledDate && t.scheduledDate !== getDefaultDateForWeek(t.weekId);

    if (filterStatus === "pending" && t.done) return false;
    if (filterStatus === "done" && !t.done) return false;
    if (filterStatus === "overdue" && !isOverdue) return false;
    if (filterStatus === "rescheduled" && !isRescheduled) return false;

    return true;
  }

  const handleAddNew = (weekId: string) => {
    const text = newTasks[weekId]?.trim();
    if (!text) return;
    onAddTask(weekId, text);
    setNewTasks((prev) => ({ ...prev, [weekId]: "" }));
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Overall Progress ── */}
      <section className="bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-serif font-bold text-foreground">
              Overall Curriculum Progress
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedTasks} of {totalTasks} milestones completed across the 3-month teacher training
            </p>
          </div>
          <div className="text-3xl font-serif font-bold text-amber-600 dark:text-amber-500">
            {overallPct}%
          </div>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-amber-600 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </section>

      {/* ── 2. Stat Tiles ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-2xl font-bold font-serif text-foreground">{totalTasks}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
            Total Tasks
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-2xl font-bold font-serif text-emerald-600">{completedTasks}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
            Completed
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-2xl font-bold font-serif text-amber-600">{remainingTasks}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
            Remaining
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="text-2xl font-bold font-serif text-purple-600">{marksAwardedCount}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
            Marks Awarded
          </div>
        </div>
      </section>

      {/* ── 3. Team Progress & Marks Grid ── */}
      {state.roster.interns.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-serif font-bold text-foreground flex items-center gap-2">
              <Users className="size-4 text-amber-600" />
              Team Progress & Marks Evaluation
            </h2>
            <span className="text-xs text-muted-foreground">
              Real-time progress and marks across all interns
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {state.roster.interns.map((intern) => {
              const internTasks = allTasks.filter(
                (t) => t.internIds.length === 0 || t.internIds.includes(intern.id)
              );
              const total = internTasks.length;
              const done = internTasks.filter((t) => t.done).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const marks = internTasks.reduce((acc, t) => acc + (t.marks || 0), 0);
              const maxPossible = total * 10;

              return (
                <div
                  key={intern.id}
                  className="p-3.5 border border-border rounded-xl bg-muted/20 space-y-2 hover:border-amber-500/30 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground truncate">
                      {intern.name}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600">{pct}%</span>
                  </div>

                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-amber-600 to-amber-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-muted-foreground">
                    <span>{done}/{total} done</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Award className="size-3" /> {marks} <span className="opacity-60 font-normal">/ {maxPossible}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. Multi-Filter Bar ── */}
      <section className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide mr-1">
          <Filter className="size-3.5" /> Filters
        </div>

        <select
          value={filterIntern}
          onChange={(e) => setFilterIntern(e.target.value)}
          className="text-xs p-2 rounded-lg border border-border bg-background focus:outline-none focus:border-amber-500 min-w-32"
        >
          <option value="">All Interns</option>
          {state.roster.interns.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>

        <select
          value={filterStaff}
          onChange={(e) => setFilterStaff(e.target.value)}
          className="text-xs p-2 rounded-lg border border-border bg-background focus:outline-none focus:border-amber-500 min-w-32"
        >
          <option value="">All Faculty Checkers</option>
          {state.roster.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs p-2 rounded-lg border border-border bg-background focus:outline-none focus:border-amber-500 min-w-28"
        >
          <option value="">All Task Types</option>
          {state.roster.types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs p-2 rounded-lg border border-border bg-background focus:outline-none focus:border-amber-500 min-w-28"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending only</option>
          <option value="done">Completed only</option>
          <option value="overdue">Overdue only</option>
          <option value="rescheduled">Rescheduled</option>
        </select>

        {(filterIntern || filterStaff || filterType || filterStatus !== "all") && (
          <button
            onClick={() => {
              setFilterIntern("");
              setFilterStaff("");
              setFilterType("");
              setFilterStatus("all");
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </section>

      {/* ── 5. Month Tabs ── */}
      <nav className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
            activeTab === "all"
              ? "bg-amber-600 border-amber-600 text-white shadow-xs"
              : "bg-card border-border text-muted-foreground hover:border-amber-500/50 hover:text-foreground"
          }`}
        >
          All Months
        </button>
        {plan.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveTab(m.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
              activeTab === m.id
                ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                : "bg-card border-border text-muted-foreground hover:border-amber-500/50 hover:text-foreground"
            }`}
          >
            {m.title.split("—")[0].trim()}
          </button>
        ))}
      </nav>

      {/* ── 6. Months & Weeks Roster ── */}
      <main className="space-y-6">
        {plan
          .filter((m) => activeTab === "all" || activeTab === m.id)
          .map((month) => {
            const monthTasks = month.weeks.flatMap((w) => getTasksForWeek(w));
            const mTotal = monthTasks.length;
            const mDone = monthTasks.filter((t) => t.done).length;
            const mPct = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;

            return (
              <section
                key={month.id}
                className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4"
              >
                {/* Month Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <h3 className="text-base font-serif font-bold text-foreground">
                      {month.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                      {month.subtitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-serif font-bold text-amber-600">
                      {mPct}%
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {mDone} of {mTotal} tasks
                    </span>
                  </div>
                </div>

                {/* Weeks Container */}
                <div className="space-y-4">
                  {month.weeks.map((week) => {
                    const tasks = getTasksForWeek(week).filter(filterTask);
                    const weekDefaultDate = getDefaultDateForWeek(week.id);

                    return (
                      <div
                        key={week.id}
                        className="border border-border/80 rounded-xl p-4 bg-muted/10 space-y-3"
                      >
                        {/* Week Title Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-foreground">
                              {week.title}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                              {week.focus}
                            </span>
                            {weekDefaultDate && (
                              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                Week of {weekDefaultDate}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {tasks.length} task{tasks.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {/* Task Items */}
                        <div className="space-y-1.5">
                          {tasks.map((task) => {
                            const typeObj = typeMap.get(task.typeId);
                            const staffObj = staffMap.get(task.staffId);
                            const isOverdue =
                              !task.done &&
                              (task.scheduledDate || weekDefaultDate) < todayStr;
                            const isRescheduled =
                              task.scheduledDate &&
                              task.scheduledDate !== weekDefaultDate;

                            return (
                              <div
                                key={task.id}
                                className={`flex items-start gap-3 p-2.5 rounded-xl border transition group ${
                                  task.done
                                    ? "bg-muted/30 border-transparent opacity-80"
                                    : isOverdue
                                    ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/40"
                                    : "bg-card border-border hover:border-amber-500/40 hover:shadow-2xs"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => onToggleTask(task.id)}
                                  className="mt-0.5 text-muted-foreground hover:text-amber-600 transition shrink-0"
                                >
                                  {task.done ? (
                                    <CheckCircle2 className="size-4 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                                  ) : (
                                    <Circle className="size-4 text-muted-foreground hover:text-amber-600" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div
                                    onClick={() => setEditingTask(task)}
                                    className={`text-xs leading-relaxed cursor-pointer font-medium hover:text-amber-600 transition ${
                                      task.done
                                        ? "line-through text-muted-foreground"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {task.text}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {/* Task Type Badge */}
                                    {typeObj && (
                                      <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-2xs"
                                        style={{ backgroundColor: typeObj.color }}
                                      >
                                        {typeObj.name}
                                      </span>
                                    )}

                                    {/* Assigned Interns Badge */}
                                    {task.internIds.length > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
                                        👤 {task.internIds.length === 1
                                          ? internMap.get(task.internIds[0])?.name || "Intern"
                                          : `${task.internIds.length} Interns`}
                                      </span>
                                    )}

                                    {/* Staff Checker Badge */}
                                    {staffObj && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300">
                                        ✓ {staffObj.name}
                                      </span>
                                    )}

                                    {/* Date / Rescheduled / Overdue Badges */}
                                    {(task.scheduledDate || isOverdue) && (
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          isOverdue
                                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300"
                                            : isRescheduled
                                            ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300"
                                            : "bg-muted text-muted-foreground border-border"
                                        }`}
                                      >
                                        📅 {task.scheduledDate || "Overdue"}
                                      </span>
                                    )}

                                    {/* Marks Badge */}
                                    {task.marks !== null && (
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          task.marks === 10
                                            ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300"
                                            : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200"
                                        }`}
                                      >
                                        🎖️ {task.marks} / 10 marks
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setEditingTask(task)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-amber-600 transition shrink-0"
                                >
                                  <Edit3 className="size-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Inline Add Task Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add task to this week…"
                            value={newTasks[week.id] || ""}
                            onChange={(e) =>
                              setNewTasks((prev) => ({ ...prev, [week.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddNew(week.id);
                            }}
                            className="flex-1 text-xs p-2 rounded-xl border border-dashed border-border bg-background focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddNew(week.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition"
                          >
                            <Plus className="size-3.5" /> Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </main>

      {/* Edit Modal */}
      <TaskEditModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        roster={state.roster}
        onSave={onSaveTask}
        onDelete={onDeleteTask}
      />
    </div>
  );
}
