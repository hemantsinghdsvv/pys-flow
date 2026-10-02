"use client";

import React, { useState } from "react";
import { Plus, Trash2, Users, UserCheck, Tag } from "lucide-react";
import { RosterState, InternMember, StaffChecker, TaskTypeItem } from "../types";
import { TYPE_PALETTE } from "../constants";

interface RosterViewProps {
  roster: RosterState;
  onAddIntern: (name: string, batch?: string) => void;
  onDeleteIntern: (id: string) => void;
  onAddStaff: (name: string, designation?: string) => void;
  onDeleteStaff: (id: string) => void;
  onAddType: (name: string, color: string) => void;
  onDeleteType: (id: string) => void;
}

export function RosterView({
  roster,
  onAddIntern,
  onDeleteIntern,
  onAddStaff,
  onDeleteStaff,
  onAddType,
  onDeleteType,
}: RosterViewProps) {
  const [newInternName, setNewInternName] = useState("");
  const [newInternBatch, setNewInternBatch] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffDesig, setNewStaffDesig] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(TYPE_PALETTE[0]);

  const handleAddIntern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternName.trim()) return;
    onAddIntern(newInternName.trim(), newInternBatch.trim() || undefined);
    setNewInternName("");
    setNewInternBatch("");
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    onAddStaff(newStaffName.trim(), newStaffDesig.trim() || undefined);
    setNewStaffName("");
    setNewStaffDesig("");
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    onAddType(newTypeName.trim(), newTypeColor);
    setNewTypeName("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* ── 1. Interns Roster Panel ── */}
      <section className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <div className="size-2.5 rounded-full bg-amber-500" />
          <h2 className="text-sm font-serif font-bold text-foreground">
            Interns Roster ({roster.interns.length})
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Yoga teacher training cohorts and interns available for curriculum assignment.
        </p>

        {/* Add Intern Form */}
        <form onSubmit={handleAddIntern} className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Full name, e.g. Priya Sharma"
            value={newInternName}
            onChange={(e) => setNewInternName(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-amber-500"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Batch (e.g. Batch 4)"
              value={newInternBatch}
              onChange={(e) => setNewInternBatch(e.target.value)}
              className="flex-1 text-xs p-2 rounded-xl border border-border bg-background focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shrink-0"
            >
              Add Intern
            </button>
          </div>
        </form>

        {/* Interns List */}
        <div className="space-y-2 overflow-y-auto max-h-96 flex-1 divide-y divide-border/60">
          {roster.interns.map((intern) => (
            <div
              key={intern.id}
              className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs grid place-items-center shrink-0">
                  {intern.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="font-semibold text-foreground truncate">{intern.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {intern.batch ? `Batch ${intern.batch}` : "TTC Intern"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteIntern(intern.id)}
                className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Staff / Faculty Checkers Panel ── */}
      <section className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <div className="size-2.5 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-serif font-bold text-foreground">
            Faculty & Checkers ({roster.staff.length})
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Yoga teachers & mentors who verify milestones and award marks.
        </p>

        {/* Add Staff Form */}
        <form onSubmit={handleAddStaff} className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Faculty name, e.g. Master Devendra"
            value={newStaffName}
            onChange={(e) => setNewStaffName(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-emerald-500"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Designation, e.g. Senior Teacher"
              value={newStaffDesig}
              onChange={(e) => setNewStaffDesig(e.target.value)}
              className="flex-1 text-xs p-2 rounded-xl border border-border bg-background focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shrink-0"
            >
              Add Staff
            </button>
          </div>
        </form>

        {/* Staff List */}
        <div className="space-y-2 overflow-y-auto max-h-96 flex-1 divide-y divide-border/60">
          {roster.staff.map((staff) => (
            <div
              key={staff.id}
              className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs grid place-items-center shrink-0">
                  {staff.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="font-semibold text-foreground truncate">{staff.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {staff.designation || "Yoga Faculty"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteStaff(staff.id)}
                className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Task Types Panel ── */}
      <section className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <div className="size-2.5 rounded-full bg-purple-500" />
          <h2 className="text-sm font-serif font-bold text-foreground">
            Task Types ({roster.types.length})
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Categorize curriculum activities (Orientation, Practice, Assessment, etc.).
        </p>

        {/* Add Type Form */}
        <form onSubmit={handleAddType} className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Type name, e.g. Philosophy"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-purple-500"
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1 p-1.5 border border-border rounded-xl bg-background">
              {TYPE_PALETTE.slice(0, 6).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTypeColor(color)}
                  className={`size-5 rounded-full transition ${
                    newTypeColor === color ? "ring-2 ring-purple-600 scale-110" : "opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shrink-0"
            >
              Add Type
            </button>
          </div>
        </form>

        {/* Task Types List */}
        <div className="space-y-2 overflow-y-auto max-h-96 flex-1 divide-y divide-border/60">
          {roster.types.map((type) => (
            <div
              key={type.id}
              className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-white text-[11px] font-bold shadow-2xs"
                  style={{ backgroundColor: type.color }}
                >
                  {type.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDeleteType(type.id)}
                className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
