"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Layers,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Users,
  FolderKanban,
  Star,
  Search,
  Send,
  Plus,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  MessageSquareQuote,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Priority, TaskStatus, ReviewVerdict } from "@prisma/client";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewTaskModal } from "./review-task-modal";
import { SubmitTaskModal } from "./submit-task-modal";
import { AssignTaskModal } from "./assign-task-modal";

export interface BatchItem {
  id: string;
  name: string;
  status: string;
  startDate: string | Date;
  endDate: string | Date;
  company?: { id: string; name: string } | null;
  projects: {
    id: string;
    name: string;
    status: string;
    students?: {
      user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        role: string;
        hierarchyLevel?: number | null;
        orgRole?: { name: string } | null;
      };
    }[];
  }[];
  students: {
    id: string;
    rollNumber?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: string;
      hierarchyLevel?: number | null;
      orgRole?: { name: string } | null;
    };
  }[];
}

export interface ReviewItem {
  id: string;
  targetId: string;
  verdict: ReviewVerdict;
  rating?: number | null;
  feedback: string;
  createdAt: string | Date;
  reviewer: {
    id: string;
    name: string;
    image?: string | null;
    orgRole?: { name: string } | null;
  };
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  estimatedHours?: number | null;
  deadline?: string | Date | null;
  createdAt: string | Date;
  completedAt?: string | Date | null;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    batchId?: string | null;
    batch?: { id: string; name: string } | null;
  } | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    hierarchyLevel?: number | null;
    orgRole?: { name: string } | null;
    studentProfile?: {
      id: string;
      batchId?: string | null;
      batch?: { id: string; name: string } | null;
    } | null;
  } | null;
  createdBy?: { id: string; name: string } | null;
  reviews?: ReviewItem[];
}

interface InternshipHubProps {
  batches: BatchItem[];
  tasks: TaskItem[];
  currentUser: {
    id: string;
    name: string;
    role: string;
    hierarchyLevel?: number | null;
    isSystemAdmin: boolean;
  };
}

export function InternshipHub({
  batches,
  tasks,
  currentUser,
}: InternshipHubProps) {
  // Is current user a supervisor/administrator (Level 1 or 2)?
  const isSupervisorOrAdmin =
    currentUser.isSystemAdmin ||
    (currentUser.hierarchyLevel !== null &&
      currentUser.hierarchyLevel !== undefined &&
      currentUser.hierarchyLevel <= 2);

  // Default to the first active batch or first available
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    batches.find((b) => b.status === "ACTIVE")?.id || batches[0]?.id || "ALL"
  );

  const [activeTab, setActiveTab] = useState<"reviews" | "interns" | "projects">("reviews");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [internFilter, setInternFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [evaluatingTask, setEvaluatingTask] = useState<TaskItem | null>(null);
  const [submittingTask, setSubmittingTask] = useState<TaskItem | null>(null);

  // Active batch object
  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  // ── STRICT LEVEL 4 INTERNS ONLY ──────────────────────────────────────────
  // Only Level 4 members are interns who receive tasks and grades.
  // Supervisors (Level 2) and Admins (Level 1) give feedback, never receive it.
  const enrolledInternsMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      hierarchyLevel?: number | null;
      orgRole?: { name: string } | null;
    }
  >();

  activeBatch?.students?.forEach((s) => {
    if (s.user.hierarchyLevel === 4) {
      enrolledInternsMap.set(s.user.id, s.user);
    }
  });

  activeBatch?.projects?.forEach((p) => {
    p.students?.forEach((ps) => {
      if (ps.user.hierarchyLevel === 4) {
        enrolledInternsMap.set(ps.user.id, ps.user);
      }
    });
  });

  const enrolledInterns = Array.from(enrolledInternsMap.values());

  // Filter tasks belonging to current batch cohort AND strictly assigned to Level 4 interns
  const batchTasks = tasks.filter((t) => {
    // Only tasks assigned to Level 4 interns (or unassigned batch tasks)
    if (t.assignee && t.assignee.hierarchyLevel !== 4) {
      return false; // Skip supervisors, team leads, admins!
    }

    if (selectedBatchId === "ALL") return true;
    const matchesProjectBatch = t.project?.batchId === selectedBatchId;
    const matchesAssigneeBatch = t.assignee?.studentProfile?.batchId === selectedBatchId;
    return matchesProjectBatch || matchesAssigneeBatch;
  });

  // Filter tasks by search and status
  const filteredTasks = batchTasks.filter((t) => {
    // Status filter
    if (statusFilter === "REVIEW" && t.status !== "REVIEW") return false;
    if (statusFilter === "COMPLETED" && t.status !== "COMPLETED") return false;
    if (statusFilter === "PENDING" && t.status !== "PENDING") return false;
    if (statusFilter === "REWORK") {
      const hasRework = t.reviews?.some((r) => r.verdict === "REWORK");
      if (!hasRework || t.status === "COMPLETED") return false;
    }

    // Intern filter
    if (internFilter !== "ALL" && t.assigneeId !== internFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchAssignee = t.assignee?.name.toLowerCase().includes(q);
      const matchProject = t.project?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchAssignee && !matchProject) return false;
    }

    return true;
  });

  // Stats calculation
  const totalTasks = batchTasks.length;
  const awaitingReviewCount = batchTasks.filter((t) => t.status === "REVIEW").length;
  const approvedCount = batchTasks.filter((t) => t.status === "COMPLETED").length;
  const reworkCount = batchTasks.filter((t) =>
    t.reviews?.some((r) => r.verdict === "REWORK") && t.status !== "COMPLETED"
  ).length;

  // Average Score calculation
  const allBatchReviews = batchTasks.flatMap((t) => t.reviews || []);
  const validRatings = allBatchReviews
    .map((r) => r.rating)
    .filter((r): r is number => typeof r === "number" && r > 0);
  const avgRating =
    validRatings.length > 0
      ? (validRatings.reduce((acc, curr) => acc + curr, 0) / validRatings.length).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* ── Top Header & Cohort Selection ───────────────────────────── */}
      <div className="rounded-2xl border border-[#00381F]/15 dark:border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00381F]/10 text-[#00381F] dark:bg-[#D9AE29]/20 dark:text-[#D9AE29]">
                <Sparkles className="size-3.5" /> Pragya Yog School
              </span>
              {activeBatch?.company && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-border/80 text-muted-foreground">
                  <MapPin className="size-3 text-[#00381F] dark:text-[#D9AE29]" />
                  {activeBatch.company.name}
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-normal tracking-tight">
              Internship & Cohort Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Practical task reviews, evaluation grading, and guidance for Level 4 trainees.
            </p>
          </div>

          {/* Batch Selector & Assign Action */}
          <div className="flex flex-wrap items-center gap-3">
            {batches.length > 1 && (
              <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-xl border border-border/60">
                <Layers className="size-4 text-muted-foreground ml-1.5" />
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value);
                    setInternFilter("ALL");
                  }}
                  className="bg-transparent text-xs font-medium text-foreground focus:outline-none pr-3 cursor-pointer"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.company?.name || "Global"})
                    </option>
                  ))}
                  <option value="ALL">All Batches & Cohorts</option>
                </select>
              </div>
            )}

            {isSupervisorOrAdmin && activeBatch && (
              <AssignTaskModal
                batchId={activeBatch.id}
                batchName={activeBatch.name}
                interns={enrolledInterns.map((i) => ({
                  id: i.id,
                  name: i.name,
                  email: i.email,
                }))}
                projects={activeBatch.projects}
              />
            )}
          </div>
        </div>

        {/* ── Key Performance Metrics ───────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-border/60">
          <div className="p-3.5 rounded-xl bg-[#00381F]/[0.03] dark:bg-[#00381F]/15 border border-[#00381F]/10">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-[#00381F] dark:text-[#D9AE29]" />
              Level 4 Interns
            </span>
            <p className="text-xl font-bold text-foreground mt-1">
              {enrolledInterns.length}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Awaiting Review
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {awaitingReviewCount}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Approved / Graded
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {approvedCount}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              Needs Rework
            </span>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {reworkCount}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3.5 rounded-xl bg-amber-400/[0.06] border border-amber-400/30">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Star className="size-3.5 fill-amber-400 text-amber-500" />
              Avg Practical Score
            </span>
            <p className="text-xl font-bold text-foreground mt-1 flex items-baseline gap-1">
              {avgRating ? `${avgRating} / 5` : "Pending"}
              {avgRating && <span className="text-xs text-amber-500">★</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "reviews" | "interns" | "projects")}
        className="space-y-4"
      >
        <TabsList className="bg-muted/50 p-1 border border-border/60 rounded-xl">
          <TabsTrigger value="reviews" className="rounded-lg gap-2 text-xs font-medium">
            <Award className="size-3.5" />
            <span>Task Review Desk ({totalTasks})</span>
          </TabsTrigger>
          <TabsTrigger value="interns" className="rounded-lg gap-2 text-xs font-medium">
            <Users className="size-3.5" />
            <span>Intern Scorecards ({enrolledInterns.length})</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="rounded-lg gap-2 text-xs font-medium">
            <FolderKanban className="size-3.5" />
            <span>Batch Initiatives ({activeBatch?.projects.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: TASK REVIEW DESK ──────────────────────────────── */}
        <TabsContent value="reviews" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: `All (${batchTasks.length})` },
                { id: "REVIEW", label: `Awaiting Review (${awaitingReviewCount})` },
                { id: "REWORK", label: `Needs Rework (${reworkCount})` },
                { id: "COMPLETED", label: `Approved (${approvedCount})` },
                { id: "PENDING", label: "In Progress" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? "bg-[#00381F] text-[#F5EFE5] dark:bg-[#D9AE29] dark:text-[#1E1E1E] shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Intern & Search Filter */}
            <div className="flex items-center gap-2">
              {enrolledInterns.length > 0 && (
                <select
                  value={internFilter}
                  onChange={(e) => setInternFilter(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Level 4 Interns</option>
                  {enrolledInterns.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 sm:w-48 pl-8 pr-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Task Cards List - Premium Redesign */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80 bg-card">
              <Award className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-medium text-foreground">
                No tasks match your filter
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {statusFilter === "REVIEW"
                  ? "There are currently no tasks awaiting supervisor evaluation in this cohort."
                  : "Try clearing search filters or assign a new practical task to the Level 4 interns."}
              </p>
              {isSupervisorOrAdmin && activeBatch && (
                <div className="mt-4">
                  <AssignTaskModal
                    batchId={activeBatch.id}
                    batchName={activeBatch.name}
                    interns={enrolledInterns.map((i) => ({
                      id: i.id,
                      name: i.name,
                      email: i.email,
                    }))}
                    projects={activeBatch.projects}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => {
                const latestReview = task.reviews && task.reviews[0];
                const isAssignee = task.assigneeId === currentUser.id;

                const isReviewStatus = task.status === "REVIEW";
                const isCompleted = task.status === "COMPLETED";
                const isRework = latestReview?.verdict === "REWORK" && !isCompleted;

                return (
                  <div
                    key={task.id}
                    className={`group relative rounded-2xl border bg-card p-5 sm:p-6 transition-all duration-200 hover:shadow-md ${
                      isReviewStatus
                        ? "border-l-[5px] border-l-amber-500 border-border/60 bg-gradient-to-r from-amber-500/[0.025] to-transparent shadow-xs"
                        : isCompleted
                        ? "border-l-[5px] border-l-emerald-600 border-border/60 bg-gradient-to-r from-emerald-500/[0.015] to-transparent"
                        : isRework
                        ? "border-l-[5px] border-l-rose-500 border-border/60 bg-gradient-to-r from-rose-500/[0.025] to-transparent"
                        : "border-l-[5px] border-l-muted-foreground/30 border-border/60"
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      {/* Top Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Project Tag */}
                          {task.project && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#00381F]/5 text-[#00381F] dark:bg-[#D9AE29]/15 dark:text-[#D9AE29] border border-[#00381F]/15 dark:border-[#D9AE29]/30">
                              <FolderKanban className="size-3" />
                              {task.project.name}
                            </span>
                          )}

                          {/* Priority Tag */}
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                              task.priority === "URGENT"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                                : task.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-200 dark:border-orange-900"
                                : "bg-muted text-muted-foreground border border-border/50"
                            }`}
                          >
                            {task.priority}
                          </span>

                          {/* Deadline */}
                          {task.deadline && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-muted-foreground/70" />
                              Due {format(new Date(task.deadline), "d MMM yyyy")}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isReviewStatus ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs">
                              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                              <span>Awaiting Supervisor Review</span>
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="size-3.5" />
                              <span>Approved & Graded</span>
                            </span>
                          ) : isRework ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                              <AlertTriangle className="size-3.5" />
                              <span>Needs Rework & Corrections</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60">
                              <Clock className="size-3.5" />
                              <span>In Progress</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Task Title & Description */}
                      <div className="space-y-1">
                        <h3 className="font-serif text-lg font-medium text-foreground tracking-tight leading-snug">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Trainee Details Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={task.assignee?.name || "Intern"}
                            image={task.assignee?.image}
                            className="size-7 ring-1 ring-border"
                          />
                          <div>
                            <span className="font-medium text-foreground">
                              {task.assignee?.name || "Unassigned"}
                            </span>
                            <span className="inline-flex items-center ml-2 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#00381F]/10 text-[#00381F] dark:bg-[#D9AE29]/20 dark:text-[#D9AE29]">
                              Level 4 Intern
                            </span>
                          </div>
                        </div>

                        {task.estimatedHours && (
                          <span className="text-xs text-muted-foreground">
                            Est. Hours: <strong className="text-foreground">{task.estimatedHours}h</strong>
                          </span>
                        )}
                      </div>

                      {/* ── Supervisor Review Showcase Card ───────────────────── */}
                      {latestReview && (
                        <div
                          className={`mt-1 p-4 rounded-xl border transition-all ${
                            latestReview.verdict === "APPROVED"
                              ? "bg-[#00381F]/[0.03] dark:bg-[#00381F]/20 border-emerald-500/30"
                              : latestReview.verdict === "REWORK"
                              ? "bg-amber-500/[0.04] dark:bg-amber-950/30 border-amber-500/30"
                              : "bg-rose-500/[0.04] dark:bg-rose-950/30 border-rose-500/30"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/40">
                            {/* Supervisor info */}
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="size-4 text-[#00381F] dark:text-[#D9AE29]" />
                              <div>
                                <span className="text-xs font-semibold text-foreground">
                                  {latestReview.reviewer.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground ml-1.5">
                                  ({latestReview.reviewer.orgRole?.name || "Supervisor / Lead Teacher"})
                                </span>
                              </div>
                            </div>

                            {/* Verdict & Score Pill */}
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  latestReview.verdict === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                    : latestReview.verdict === "REWORK"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
                                }`}
                              >
                                {latestReview.verdict === "APPROVED"
                                  ? "Passed & Graded"
                                  : latestReview.verdict === "REWORK"
                                  ? "Rework Required"
                                  : "Declined"}
                              </span>

                              {latestReview.rating && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
                                  <span>{"★".repeat(latestReview.rating)}</span>
                                  <span className="text-[11px]">
                                    ({latestReview.rating}/5)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Supervisor Feedback / Quote */}
                          <div className="flex items-start gap-2.5 pt-2.5">
                            <MessageSquareQuote className="size-4 text-[#00381F] dark:text-[#D9AE29] shrink-0 mt-0.5" />
                            <p className="font-serif text-sm italic text-foreground/90 leading-relaxed">
                              &ldquo;{latestReview.feedback}&rdquo;
                            </p>
                          </div>

                          <div className="text-[10px] text-muted-foreground mt-2 text-right">
                            Evaluated on {format(new Date(latestReview.createdAt), "d MMMM yyyy, h:mm a")}
                          </div>
                        </div>
                      )}

                      {/* ── Actions Footer Row ────────────────────────────────── */}
                      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                        {/* Supervisor Action Button */}
                        {isSupervisorOrAdmin && (
                          <Button
                            size="sm"
                            onClick={() => setEvaluatingTask(task)}
                            className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-8.5 px-3.5 gap-1.5 shadow-xs font-medium cursor-pointer"
                          >
                            <Award className="size-3.5" />
                            <span>{latestReview ? "Update Evaluation" : "Review & Grade Task"}</span>
                          </Button>
                        )}

                        {/* Intern Action Button */}
                        {isAssignee && task.status === "PENDING" && (
                          <Button
                            size="sm"
                            onClick={() => setSubmittingTask(task)}
                            className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-8.5 px-3.5 gap-1.5 shadow-xs font-medium cursor-pointer"
                          >
                            {isRework ? (
                              <>
                                <RotateCcw className="size-3.5" />
                                <span>Resubmit After Corrections</span>
                              </>
                            ) : (
                              <>
                                <Send className="size-3.5" />
                                <span>Submit for Review</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: INTERNS SCORECARD & ROSTER ─────────────────────── */}
        <TabsContent value="interns" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledInterns.map((intern) => {
              const internTasks = batchTasks.filter((t) => t.assigneeId === intern.id);
              const completedCount = internTasks.filter((t) => t.status === "COMPLETED").length;
              const underReviewCount = internTasks.filter((t) => t.status === "REVIEW").length;
              const reworkInternCount = internTasks.filter((t) =>
                t.reviews?.some((r) => r.verdict === "REWORK") && t.status !== "COMPLETED"
              ).length;

              const internReviews = internTasks.flatMap((t) => t.reviews || []);
              const internRatings = internReviews
                .map((r) => r.rating)
                .filter((r): r is number => typeof r === "number" && r > 0);
              const internAvg =
                internRatings.length > 0
                  ? (
                      internRatings.reduce((acc, curr) => acc + curr, 0) /
                      internRatings.length
                    ).toFixed(1)
                  : null;

              const percent =
                internTasks.length > 0
                  ? Math.round((completedCount / internTasks.length) * 100)
                  : 0;

              return (
                <Card
                  key={intern.id}
                  className="p-5 border-border/60 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={intern.name} image={intern.image} className="size-11 ring-1 ring-border" />
                        <div>
                          <h4 className="font-serif text-base font-medium text-foreground">
                            {intern.name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {intern.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00381F]/10 text-[#00381F] dark:bg-[#D9AE29]/20 dark:text-[#D9AE29] border border-[#00381F]/20">
                        Level 4 Intern
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Curriculum Mastery</span>
                        <span className="font-semibold text-foreground">{percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00381F] dark:bg-[#D9AE29] transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Counters */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-center text-xs">
                      <div className="p-2 rounded-xl bg-muted/40 border border-border/40">
                        <span className="block text-[10px] text-muted-foreground">Total</span>
                        <span className="font-bold text-foreground">{internTasks.length}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <span className="block text-[10px]">Review</span>
                        <span className="font-bold">{underReviewCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="block text-[10px]">Passed</span>
                        <span className="font-bold">{completedCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        <span className="block text-[10px]">Rework</span>
                        <span className="font-bold">{reworkInternCount}</span>
                      </div>
                    </div>

                    {/* Practical Score Box */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-xs">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <Star className="size-4 fill-amber-400 text-amber-500" />
                        Practical Evaluation:
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {internAvg ? `${internAvg} / 5.0 ★` : "Not graded yet"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-border/40 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInternFilter(intern.id);
                        setActiveTab("reviews");
                      }}
                      className="text-xs h-8 px-3 flex-1"
                    >
                      View Evaluation Tasks
                    </Button>
                    {isSupervisorOrAdmin && activeBatch && (
                      <AssignTaskModal
                        batchId={activeBatch.id}
                        batchName={activeBatch.name}
                        interns={[{ id: intern.id, name: intern.name, email: intern.email }]}
                        projects={activeBatch.projects}
                        initialInternId={intern.id}
                        trigger={
                          <Button size="sm" className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-8 px-3">
                            <Plus className="size-3 mr-1" /> Assign Task
                          </Button>
                        }
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TAB 3: BATCH PROJECTS & INITIATIVES ───────────────────── */}
        <TabsContent value="projects" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-serif text-lg">
                Linked Projects in {activeBatch?.name || "Cohort"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBatch?.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects currently linked to this batch cohort.
                </p>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden">
                  {activeBatch?.projects.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FolderKanban className="size-5 text-[#00381F] dark:text-[#D9AE29]" />
                        <div>
                          <Link
                            href={`/projects/${p.id}`}
                            className="text-sm font-medium hover:underline text-foreground"
                          >
                            {p.name}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            Status: {p.status}
                          </span>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                        <Link href={`/projects/${p.id}`}>
                          Open Project <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <ReviewTaskModal
        task={
          evaluatingTask
            ? {
                id: evaluatingTask.id,
                title: evaluatingTask.title,
                assignee: evaluatingTask.assignee,
                project: evaluatingTask.project,
                latestReview: evaluatingTask.reviews?.[0] || null,
              }
            : null
        }
        open={Boolean(evaluatingTask)}
        onOpenChange={(open) => !open && setEvaluatingTask(null)}
      />

      <SubmitTaskModal
        task={submittingTask}
        open={Boolean(submittingTask)}
        onOpenChange={(open) => !open && setSubmittingTask(null)}
      />
    </div>
  );
}
