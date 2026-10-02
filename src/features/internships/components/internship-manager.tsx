"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Users, 
  FolderKanban, 
  Eye, 
  RotateCcw,
  Sparkles,
  Award
} from "lucide-react";
import { 
  InternshipPlannerState, 
  PlannerViewType, 
  TaskEditData, 
  InternMember, 
  StaffChecker, 
  TaskTypeItem 
} from "../types";
import { 
  CURRICULUM_PLAN, 
  DEFAULT_TASK_TYPES, 
  STORAGE_KEY 
} from "../constants";
import { PlannerView } from "./planner-view";
import { ProfilesView } from "./profiles-view";
import { RosterView } from "./roster-view";
import { InternPortalView } from "./intern-portal-view";

interface InternshipManagerProps {
  initialInterns: InternMember[];
  initialStaff: StaffChecker[];
  currentUser: {
    id: string;
    name: string;
    role: string;
    isSystemAdmin: boolean;
    hierarchyLevel: number | null;
  };
}

export function InternshipManager({
  initialInterns,
  initialStaff,
  currentUser,
}: InternshipManagerProps) {
  const isAdminOrFaculty =
    currentUser.isSystemAdmin ||
    (currentUser.hierarchyLevel !== null && currentUser.hierarchyLevel <= 2);

  const [activeView, setActiveView] = useState<PlannerViewType>(
    isAdminOrFaculty ? "planner" : "intern-portal"
  );

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [selectedInternId, setSelectedInternId] = useState<string>("");

  const [state, setState] = useState<InternshipPlannerState>(() => {
    // Provide sensible default state before client mount
    return {
      done: {},
      edits: {},
      custom: {},
      removed: {},
      planStart: new Date().toISOString().split("T")[0],
      roster: {
        interns: initialInterns.length > 0 ? initialInterns : [
          { id: "i1", name: "Vishal", batch: "TTC-2026" },
          { id: "i2", name: "Aman", batch: "TTC-2026" },
          { id: "i3", name: "Ankit", batch: "TTC-2026" },
          { id: "i4", name: "Priya Sharma", batch: "TTC-2026" },
        ],
        staff: initialStaff.length > 0 ? initialStaff : [
          { id: "s1", name: "Master Devendra", designation: "Senior Yoga Teacher" },
          { id: "s2", name: "Pooja Verma", designation: "Yoga Instructor" },
          { id: "s3", name: "Dr. K. Swaminathan", designation: "Guest Teacher & Philosophy" },
          { id: "s4", name: "Aarya Kuldeep", designation: "Administrator" },
        ],
        types: DEFAULT_TASK_TYPES,
      },
    };
  });

  // Client-side hydration from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState((prev) => ({
          done: parsed.done || prev.done,
          edits: parsed.edits || prev.edits,
          custom: parsed.custom || prev.custom,
          removed: parsed.removed || prev.removed,
          planStart: parsed.planStart || prev.planStart,
          roster: {
            interns:
              parsed.roster?.interns && parsed.roster.interns.length > 0
                ? parsed.roster.interns
                : prev.roster.interns,
            staff:
              parsed.roster?.staff && parsed.roster.staff.length > 0
                ? parsed.roster.staff
                : prev.roster.staff,
            types:
              parsed.roster?.types && parsed.roster.types.length > 0
                ? parsed.roster.types
                : prev.roster.types,
          },
        }));
      }
    } catch (e) {
      console.warn("Could not load internship state from localStorage", e);
    }
  }, []);

  // Sync to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save internship state to localStorage", e);
    }
  }, [state]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // State Mutators
  const handleToggleTask = (taskId: string) => {
    setState((prev) => {
      const isDone = !prev.done[taskId];
      const nextDone = { ...prev.done, [taskId]: isDone };
      showToast(isDone ? "Milestone marked complete!" : "Milestone reopened.");
      return { ...prev, done: nextDone };
    });
  };

  const handleSaveTask = (taskId: string, data: TaskEditData) => {
    setState((prev) => {
      const nextEdits = { ...prev.edits, [taskId]: { ...(prev.edits[taskId] || {}), ...data } };
      showToast("Task updated & scheduled successfully.");
      return { ...prev, edits: nextEdits };
    });
  };

  const handleAddTask = (weekId: string, text: string) => {
    setState((prev) => {
      const newId = `${weekId}-c${Date.now()}`;
      const weekCustoms = prev.custom[weekId] || [];
      const updated = [...weekCustoms, { id: newId, text, weekId }];
      showToast("New milestone added to week.");
      return { ...prev, custom: { ...prev.custom, [weekId]: updated } };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setState((prev) => {
      showToast("Task removed.");
      return { ...prev, removed: { ...prev.removed, [taskId]: true } };
    });
  };

  // Roster Mutators
  const handleAddIntern = (name: string, batch?: string) => {
    const newIntern: InternMember = {
      id: `i-${Date.now()}`,
      name,
      batch: batch || "TTC-2026",
    };
    setState((prev) => ({
      ...prev,
      roster: { ...prev.roster, interns: [...prev.roster.interns, newIntern] },
    }));
    showToast(`Intern ${name} added to roster.`);
  };

  const handleDeleteIntern = (id: string) => {
    setState((prev) => ({
      ...prev,
      roster: {
        ...prev.roster,
        interns: prev.roster.interns.filter((i) => i.id !== id),
      },
    }));
    showToast("Intern removed from roster.");
  };

  const handleAddStaff = (name: string, designation?: string) => {
    const newStaff: StaffChecker = {
      id: `s-${Date.now()}`,
      name,
      designation: designation || "Yoga Faculty",
    };
    setState((prev) => ({
      ...prev,
      roster: { ...prev.roster, staff: [...prev.roster.staff, newStaff] },
    }));
    showToast(`Staff member ${name} added.`);
  };

  const handleDeleteStaff = (id: string) => {
    setState((prev) => ({
      ...prev,
      roster: {
        ...prev.roster,
        staff: prev.roster.staff.filter((s) => s.id !== id),
      },
    }));
    showToast("Staff checker removed.");
  };

  const handleAddType = (name: string, color: string) => {
    const newType: TaskTypeItem = {
      id: `tt-${Date.now()}`,
      name,
      color,
    };
    setState((prev) => ({
      ...prev,
      roster: { ...prev.roster, types: [...prev.roster.types, newType] },
    }));
    showToast(`Task type "${name}" created.`);
  };

  const handleDeleteType = (id: string) => {
    setState((prev) => ({
      ...prev,
      roster: {
        ...prev.roster,
        types: prev.roster.types.filter((t) => t.id !== id),
      },
    }));
    showToast("Task type removed.");
  };

  const handleResetAll = () => {
    if (confirm("Reset internship planner back to initial state?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  // Find active intern for Intern Portal view
  const activeIntern =
    state.roster.interns.find((i) => i.id === selectedInternId) ||
    state.roster.interns.find((i) => i.id === currentUser.id || i.name.toLowerCase() === currentUser.name.toLowerCase()) ||
    state.roster.interns[0] || { id: "default", name: currentUser.name, batch: "TTC-2026" };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Perspective Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <nav className="inline-flex bg-card border border-border p-1.5 rounded-2xl shadow-xs gap-1 flex-wrap">
          {isAdminOrFaculty && (
            <>
              <button
                type="button"
                onClick={() => setActiveView("planner")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeView === "planner"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-amber-600"
                }`}
              >
                <ClipboardList className="size-4" /> 📋 Planner
              </button>
              <button
                type="button"
                onClick={() => setActiveView("profiles")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeView === "profiles"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-amber-600"
                }`}
              >
                <Users className="size-4" /> 👥 Intern Profiles
              </button>
              <button
                type="button"
                onClick={() => setActiveView("roster")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeView === "roster"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-amber-600"
                }`}
              >
                <FolderKanban className="size-4" /> 🗂️ Roster & Types
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveView("intern-portal")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeView === "intern-portal"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-amber-600"
            }`}
          >
            <Eye className="size-4" /> {isAdminOrFaculty ? "👁️ Preview Intern Portal" : "🧘 Intern Portal"}
          </button>
        </nav>

        {/* Top Actions */}
        {isAdminOrFaculty && (
          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
          >
            <RotateCcw className="size-3.5" /> Reset All
          </button>
        )}
      </div>

      {/* ── Active View Rendering ── */}
      {activeView === "planner" && (
        <PlannerView
          plan={CURRICULUM_PLAN}
          state={state}
          onToggleTask={handleToggleTask}
          onSaveTask={handleSaveTask}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {activeView === "profiles" && (
        <ProfilesView
          plan={CURRICULUM_PLAN}
          state={state}
          onToggleTask={handleToggleTask}
        />
      )}

      {activeView === "roster" && (
        <RosterView
          roster={state.roster}
          onAddIntern={handleAddIntern}
          onDeleteIntern={handleDeleteIntern}
          onAddStaff={handleAddStaff}
          onDeleteStaff={handleDeleteStaff}
          onAddType={handleAddType}
          onDeleteType={handleDeleteType}
        />
      )}

      {activeView === "intern-portal" && (
        <InternPortalView
          plan={CURRICULUM_PLAN}
          state={state}
          activeIntern={activeIntern}
          onToggleTask={handleToggleTask}
          onSelectIntern={setSelectedInternId}
          showInternPicker={isAdminOrFaculty}
        />
      )}

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
