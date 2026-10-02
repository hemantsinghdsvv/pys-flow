"use client";

import React, { useState } from "react";
import { 
  Award, 
  CheckCircle2, 
  Circle, 
  Users, 
  Calendar, 
  Clock, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { 
  CurriculumMonth, 
  InternshipPlannerState, 
  CurriculumTask, 
  ProfileMode 
} from "../types";
import { WEEK_INDEX_MAP } from "../constants";

interface ProfilesViewProps {
  plan: CurriculumMonth[];
  state: InternshipPlannerState;
  onToggleTask: (taskId: string) => void;
}

export function ProfilesView({ plan, state, onToggleTask }: ProfilesViewProps) {
  const [mode, setMode] = useState<ProfileMode>("single");
  const [selectedInternId, setSelectedInternId] = useState<string>(
    state.roster.interns[0]?.id || ""
  );
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>(
    state.roster.interns.slice(0, 4).map((i) => i.id)
  );

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

  function getAllTasks(): CurriculumTask[] {
    return plan.flatMap((m) =>
      m.weeks.flatMap((w) => {
        const defaults = w.tasks
          .map((text, i) => {
            const id = `${w.id}-d${i}`;
            if (state.removed[id]) return null;
            const e = state.edits[id] || {};
            return {
              id,
              weekId: w.id,
              text: e.text !== undefined ? e.text : text,
              typeId: e.typeId || "",
              scheduledDate: e.scheduledDate || "",
              scheduledTime: e.scheduledTime || "",
              marks: e.marks !== undefined ? e.marks : null,
              markedBy: e.markedBy || "",
              internIds: e.internIds || [],
              staffId: e.staffId || "",
              done: !!state.done[id],
            };
          })
          .filter(Boolean) as CurriculumTask[];

        const customs = (state.custom[w.id] || [])
          .map((c, i) => {
            const id = (c as any).id || `${w.id}-c${i}`;
            if (state.removed[id]) return null;
            return {
              id,
              weekId: w.id,
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
      })
    );
  }

  const allTasks = getAllTasks();

  const toggleBatchIntern = (id: string) => {
    setBatchSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  };

  const internsToDisplay =
    mode === "single"
      ? state.roster.interns.filter((i) => i.id === selectedInternId)
      : state.roster.interns.filter((i) => batchSelectedIds.includes(i.id));

  return (
    <div className="space-y-6">
      {/* ── Mode Controls ── */}
      <section className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex bg-muted p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === "single"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Single Intern
          </button>
          <button
            type="button"
            onClick={() => setMode("batch")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === "batch"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Batch Comparison (up to 4)
          </button>
        </div>

        {mode === "single" ? (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground">Select Intern:</label>
            <select
              value={selectedInternId}
              onChange={(e) => setSelectedInternId(e.target.value)}
              className="text-xs p-2 rounded-xl border border-border bg-background font-semibold focus:outline-none focus:border-amber-500"
            >
              {state.roster.interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.batch ? `(${i.batch})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setBatchSelectedIds(state.roster.interns.slice(0, 4).map((i) => i.id))}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              Select first 4
            </button>
          </div>
        )}
      </section>

      {/* Batch selector chips */}
      {mode === "batch" && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground mr-2">Choose interns to compare:</span>
          {state.roster.interns.map((intern) => {
            const isSelected = batchSelectedIds.includes(intern.id);
            return (
              <button
                key={intern.id}
                type="button"
                onClick={() => toggleBatchIntern(intern.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  isSelected
                    ? "bg-amber-600 border-amber-600 text-white shadow-2xs"
                    : "bg-muted/40 border-border text-muted-foreground hover:border-amber-500/50"
                }`}
              >
                {intern.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Intern Profile Cards Grid ── */}
      {internsToDisplay.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl text-muted-foreground">
          No interns selected.
        </div>
      ) : (
        <div
          className={`grid gap-6 ${
            internsToDisplay.length === 1
              ? "grid-cols-1"
              : internsToDisplay.length === 2
              ? "grid-cols-1 md:grid-cols-2"
              : internsToDisplay.length === 3
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {internsToDisplay.map((intern) => {
            const internTasks = allTasks.filter(
              (t) => t.internIds.length === 0 || t.internIds.includes(intern.id)
            );
            const total = internTasks.length;
            const done = internTasks.filter((t) => t.done).length;
            const left = total - done;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const marksAwarded = internTasks.reduce((acc, t) => acc + (t.marks || 0), 0);
            const maxMarks = total * 10;
            const marksPct = maxMarks > 0 ? Math.round((marksAwarded / maxMarks) * 100) : 0;

            const initials = intern.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={intern.id}
                className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col"
              >
                {/* Profile Card Header */}
                <div className="p-5 border-b border-border bg-linear-to-b from-card to-muted/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-linear-to-br from-amber-600 to-amber-500 text-white font-bold text-sm grid place-items-center shadow-xs shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif font-bold text-sm text-foreground truncate">
                        {intern.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {intern.batch ? `Batch ${intern.batch}` : "Yoga TTC Intern"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-bold text-foreground">{done} done</span>
                      <span className="text-muted-foreground block text-[10px]">· {left} left</span>
                    </div>
                  </div>

                  {/* Marks Score Row */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                        Marks Score
                      </span>
                      <div className="flex items-baseline gap-1 text-purple-700 dark:text-purple-300 font-serif font-bold text-xl">
                        {marksAwarded}
                        <span className="text-xs font-semibold text-purple-400 dark:text-purple-500">
                          / {maxMarks}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-purple-700 dark:text-purple-300 font-serif">
                        {marksPct}%
                      </span>
                      <span className="block text-[10px] text-muted-foreground">graded</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                      <span>Curriculum completion</span>
                      <span className="text-amber-600 font-bold">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-amber-600 to-amber-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Card Body (Task Breakdown) */}
                <div className="p-3 overflow-y-auto max-h-[500px] flex-1 divide-y divide-border/60 space-y-3">
                  {plan.map((month) => {
                    const monthTasks = month.weeks
                      .flatMap((w) =>
                        w.tasks.map((text, i) => {
                          const id = `${w.id}-d${i}`;
                          if (state.removed[id]) return null;
                          const e = state.edits[id] || {};
                          const internIds = e.internIds || [];
                          if (internIds.length > 0 && !internIds.includes(intern.id)) return null;

                          return {
                            id,
                            weekTitle: w.title,
                            weekFocus: w.focus,
                            text: e.text !== undefined ? e.text : text,
                            typeId: e.typeId || "",
                            scheduledDate: e.scheduledDate || getDefaultDateForWeek(w.id),
                            marks: e.marks !== undefined ? e.marks : null,
                            staffId: e.staffId || "",
                            done: !!state.done[id],
                          };
                        })
                      )
                      .filter(Boolean) as (CurriculumTask & { weekTitle: string; weekFocus: string })[];

                    if (monthTasks.length === 0) return null;

                    return (
                      <div key={month.id} className="pt-2 first:pt-0 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {month.title.split("—")[0].trim()}
                        </div>

                        <div className="space-y-1.5">
                          {monthTasks.map((t) => {
                            const isOverdue = !t.done && t.scheduledDate && t.scheduledDate < todayStr;
                            const typeObj = typeMap.get(t.typeId);

                            return (
                              <div
                                key={t.id}
                                className={`p-2 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                                  t.done
                                    ? "bg-muted/20 border-transparent opacity-70"
                                    : isOverdue
                                    ? "bg-red-50/50 dark:bg-red-950/10 border-red-200"
                                    : "bg-background border-border"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => onToggleTask(t.id)}
                                  className="mt-0.5 text-muted-foreground hover:text-amber-600 shrink-0"
                                >
                                  {t.done ? (
                                    <CheckCircle2 className="size-3.5 text-emerald-600 fill-emerald-100" />
                                  ) : (
                                    <Circle className="size-3.5 text-muted-foreground" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`leading-snug font-medium text-[11px] ${
                                      t.done ? "line-through text-muted-foreground" : "text-foreground"
                                    }`}
                                  >
                                    {t.text}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {t.weekTitle}
                                    </span>
                                    {typeObj && (
                                      <span
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                                        style={{ backgroundColor: typeObj.color }}
                                      >
                                        {typeObj.name}
                                      </span>
                                    )}
                                    {t.marks !== null && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                        🎖️ {t.marks}/10
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
