"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Check, UserCheck, Calendar, Clock, Award } from "lucide-react";
import { CurriculumTask, RosterState, TaskEditData } from "../types";

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CurriculumTask | null;
  roster: RosterState;
  onSave: (taskId: string, data: TaskEditData) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskEditModal({
  isOpen,
  onClose,
  task,
  roster,
  onSave,
  onDelete,
}: TaskEditModalProps) {
  const [text, setText] = useState("");
  const [typeId, setTypeId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [marks, setMarks] = useState<string>("");
  const [markedBy, setMarkedBy] = useState("");
  const [internIds, setInternIds] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setText(task.text || "");
      setTypeId(task.typeId || "");
      setStaffId(task.staffId || "");
      setScheduledDate(task.scheduledDate || "");
      setScheduledTime(task.scheduledTime || "");
      setMarks(task.marks !== null && task.marks !== undefined ? String(task.marks) : "");
      setMarkedBy(task.markedBy || "");
      setInternIds(task.internIds || []);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const toggleIntern = (id: string) => {
    setInternIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllInterns = () => {
    setInternIds(roster.interns.map((i) => i.id));
  };

  const clearAllInterns = () => {
    setInternIds([]);
  };

  const handleSave = () => {
    const parsedMarks = marks === "" ? null : Math.max(0, Math.min(10, Number(marks)));
    onSave(task.id, {
      text,
      typeId,
      staffId,
      scheduledDate,
      scheduledTime,
      marks: isNaN(parsedMarks as number) ? null : parsedMarks,
      markedBy,
      internIds,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4 mb-5">
          <div>
            <h3 className="text-lg font-serif font-bold text-foreground">
              Edit Internship Task
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tasks are part of the curriculum — reschedule, assign interns, and award marks.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Task Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Task Description
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe the yoga task or assignment…"
              rows={3}
              className="w-full text-sm p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* Type & Staff Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Task Type
              </label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-amber-500"
              >
                <option value="">Select type…</option>
                {roster.types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Staff Checker
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-amber-500"
              >
                <option value="">Select faculty/checker…</option>
                {roster.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.designation ? `(${s.designation})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Change to reschedule task to a specific date.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="size-3.5" /> Scheduled Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Assigned Interns Multi-Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="size-3.5" /> Assigned Interns ({internIds.length})
              </label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllInterns}
                  className="text-amber-600 hover:text-amber-700 font-semibold"
                >
                  Select all
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={clearAllInterns}
                  className="text-muted-foreground hover:text-foreground font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="p-3 border border-border rounded-xl bg-muted/20 max-h-36 overflow-y-auto flex flex-wrap gap-2">
              {roster.interns.length === 0 ? (
                <span className="text-xs text-muted-foreground">No interns in roster yet.</span>
              ) : (
                roster.interns.map((intern) => {
                  const isSelected = internIds.includes(intern.id);
                  return (
                    <button
                      key={intern.id}
                      type="button"
                      onClick={() => toggleIntern(intern.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold"
                          : "bg-background border-border text-foreground hover:border-amber-500/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-amber-600 size-3"
                      />
                      <span>{intern.name}</span>
                      {intern.batch && (
                        <span className="text-[10px] text-muted-foreground">({intern.batch})</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Select one intern for an individual task, or multiple for batch assignments.
            </p>
          </div>

          {/* Marks & Evaluation Row */}
          <div className="p-4 border border-purple-200 dark:border-purple-900/40 rounded-xl bg-purple-50/40 dark:bg-purple-950/10 space-y-3">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-xs uppercase tracking-wide">
              <Award className="size-4" /> Practical Evaluation & Marks
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Marks Awarded (Out of 10)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    placeholder="—"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="w-24 text-base font-bold text-center p-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-background focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">/ 10 marks</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Marks Awarded By
                </label>
                <select
                  value={markedBy}
                  onChange={(e) => setMarkedBy(e.target.value)}
                  className="w-full text-sm p-2 rounded-xl border border-border bg-background focus:outline-none"
                >
                  <option value="">Select evaluator…</option>
                  {roster.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Each milestone is graded up to 10 marks upon completion and verification by faculty.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4 mt-6">
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
            >
              <Trash2 className="size-4" /> Remove Task
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
