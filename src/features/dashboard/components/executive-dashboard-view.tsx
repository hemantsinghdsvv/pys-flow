"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import {
  Compass,
  FolderKanban,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Users,
  Building2,
  Calendar,
  Sparkles,
  Plus,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  Activity,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PopulatedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string | Date | null;
  assignee: {
    id: string;
    name: string;
    email?: string;
    image?: string | null;
    designation?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

interface PopulatedProject {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  tasks: {
    id: string;
    status: string;
    priority: string;
  }[];
}

interface DepartmentSummary {
  id: string;
  name: string;
  code: string | null;
  staffCount: number;
  taskCount: number;
}

interface ActivityLogItem {
  id: string;
  action: string;
  entityType: string;
  entityName?: string | null;
  createdAt: string | Date;
  user: {
    name: string;
    image?: string | null;
  };
}

interface ExecutiveDashboardProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    designation?: string | null;
    isSystemAdmin: boolean;
  };
  projects: PopulatedProject[];
  tasks: PopulatedTask[];
  departments: DepartmentSummary[];
  recentActivities?: ActivityLogItem[];
  reportsTodayCount: number;
  totalStaffCount: number;
}

export function ExecutiveDashboardView({
  currentUser,
  projects,
  tasks,
  departments,
  recentActivities = [],
  reportsTodayCount,
  totalStaffCount,
}: ExecutiveDashboardProps) {
  const [taskFilter, setTaskFilter] = useState<"ALL" | "ATTENTION" | "REVIEW" | "PENDING" | "COMPLETED">("ALL");

  // Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const reviewTasks = tasks.filter((t) => t.status === "REVIEW").length;
  const pendingTasks = tasks.filter((t) => t.status === "PENDING").length;

  const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Critical items: Overdue or Urgent
  const overdueTasks = tasks.filter((t) => {
    if (!t.deadline || t.status === "COMPLETED" || t.status === "CANCELLED") return false;
    return isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline));
  });

  const urgentTasks = tasks.filter(
    (t) => t.priority === "URGENT" && t.status !== "COMPLETED" && t.status !== "CANCELLED"
  );

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "ALL") return true;
    if (taskFilter === "ATTENTION") {
      const isOverdue = t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)) && t.status !== "COMPLETED";
      return t.priority === "URGENT" || isOverdue;
    }
    if (taskFilter === "REVIEW") return t.status === "REVIEW";
    if (taskFilter === "PENDING") return t.status === "PENDING";
    if (taskFilter === "COMPLETED") return t.status === "COMPLETED";
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* ── Director Header & Quick Buttons ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              Director Dashboard
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · Pragya Yog School
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Director & Founder Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here is a simple overview of what is happening across Pragya Yog School today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" asChild className="h-9 shadow-xs">
            <Link href="/kanban" className="flex items-center gap-1.5">
              <FolderKanban className="size-4 text-primary" />
              <span>Kanban Board</span>
            </Link>
          </Button>
          <Button size="sm" asChild className="h-9 bg-[#00381F] hover:bg-[#074b2b] text-white shadow-sm">
            <Link href="/tasks/new" className="flex items-center gap-1.5">
              <Plus className="size-4" />
              <span>+ Assign Task</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 4 Simple Overview Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Main Programs */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-shadow bg-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Main Programs
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Compass className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">{projects.length} Active</div>
              <Badge variant="outline" className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                Courses & Retreats
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {projects.filter((p) => p.status === "ACTIVE").length} programs running right now
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Work Done */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-shadow bg-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Work Completed
            </span>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">{overallProgress}%</div>
              <span className="text-xs font-medium text-muted-foreground">
                {completedTasks} of {totalTasks} done
              </span>
            </div>
            <div className="mt-2.5">
              <Progress value={overallProgress} className="h-2 bg-secondary" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {pendingTasks} in progress · {reviewTasks} need review
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Needs Attention */}
        <Card
          className={`relative overflow-hidden border shadow-xs transition-shadow ${
            overdueTasks.length > 0 || urgentTasks.length > 0
              ? "border-amber-400/60 dark:border-amber-600/60 bg-amber-50/30 dark:bg-amber-950/20"
              : "border-border/80 bg-card"
          }`}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Needs Attention
            </span>
            <div
              className={`size-8 rounded-lg flex items-center justify-center ${
                overdueTasks.length > 0
                  ? "bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">
                {overdueTasks.length + urgentTasks.length}
              </div>
              {overdueTasks.length > 0 ? (
                <Badge variant="destructive" className="text-[11px] font-semibold">
                  {overdueTasks.length} Overdue
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px] text-emerald-600 bg-emerald-50">
                  All On Time
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {urgentTasks.length} urgent tasks · {reviewTasks} ready for review
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Team & Staff */}
        <Card className="relative overflow-hidden border border-border/80 shadow-xs hover:shadow-md transition-shadow bg-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Team & Staff
            </span>
            <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-foreground">{totalStaffCount} Members</div>
              <Badge variant="secondary" className="text-[11px]">
                {departments.length} Depts
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Yoga, Finance, Studio Ops & Scheduling
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Urgent Tasks Alert: Needs Quick Attention ───────────────────────── */}
      {(overdueTasks.length > 0 || urgentTasks.length > 0) && (
        <Card className="border-l-4 border-l-red-500 border-amber-300/50 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/80 via-white to-background dark:from-amber-950/20 dark:via-background dark:to-background shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-red-900 dark:text-red-300">
                <Flame className="size-5 text-red-600 dark:text-red-400 shrink-0" />
                <span>Tasks That Need Quick Attention</span>
              </CardTitle>
              <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/40">
                {overdueTasks.length + urgentTasks.length} Tasks
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
              These tasks are either overdue or marked urgent. You can click on them to review or help the team.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border/60">
              {Array.from(new Set([...overdueTasks, ...urgentTasks])).map((task) => {
                const isOverdue = task.deadline && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline));
                return (
                  <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-2 rounded-full bg-red-500 mt-2 shrink-0" />
                      <div>
                        <Link
                          href={`/tasks/${task.id}`}
                          className="font-medium text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <span className="truncate">{task.title}</span>
                          <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          {task.project && (
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {task.project.name}
                            </span>
                          )}
                          <span>•</span>
                          <span>Assigned to: <strong className="text-foreground">{task.assignee?.name || "Unassigned"}</strong></span>
                          <span>•</span>
                          <span className={isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                            {task.deadline ? (isOverdue ? `Overdue (Was due ${format(new Date(task.deadline), "MMM d")})` : `Due ${format(new Date(task.deadline), "MMM d")}`) : "No deadline"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Badge variant="outline" className={task.priority === "URGENT" ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20" : "border-orange-500 text-orange-600"}>
                        {task.priority}
                      </Badge>
                      <Button size="sm" variant="ghost" asChild className="h-8 text-xs hover:bg-primary/10 hover:text-primary">
                        <Link href={`/tasks/${task.id}`}>Open Task</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Programs & Projects ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <FolderKanban className="size-5 text-emerald-600 dark:text-emerald-400" />
              Programs & Projects
            </h2>
            <p className="text-xs text-muted-foreground">
              Yoga teacher training courses, upcoming retreats, and studio updates.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs text-primary hover:text-primary/80">
            <Link href="/projects" className="flex items-center gap-1">
              <span>View All Projects</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => {
            const projectTasks = proj.tasks || [];
            const projTotal = projectTasks.length;
            const projDone = projectTasks.filter((t) => t.status === "COMPLETED").length;
            const projPercent = projTotal === 0 ? 0 : Math.round((projDone / projTotal) * 100);

            let statusBadgeClass = "bg-secondary text-secondary-foreground";
            if (proj.status === "ACTIVE") statusBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
            if (proj.status === "PLANNING") statusBadgeClass = "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300";
            if (proj.status === "COMPLETED") statusBadgeClass = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";

            return (
              <Card
                key={proj.id}
                className="group border border-border/70 hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-card"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusBadgeClass}`}>
                      {proj.status}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      {proj.priority} Priority
                    </span>
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-1 mt-2">
                    <Link href={`/projects/${proj.id}`}>{proj.name}</Link>
                  </CardTitle>
                  {proj.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {proj.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-bold text-foreground">{projPercent}%</span>
                    </div>
                    <Progress value={projPercent} className="h-2 bg-secondary" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>{projDone} of {projTotal} tasks done</span>
                      <Link
                        href={`/projects/${proj.id}`}
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        View <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Team Tasks Table ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <ListTodo className="size-5 text-primary" />
              Team Tasks
            </h2>
            <p className="text-xs text-muted-foreground">
              See what everyone is working on, what needs review, and what is finished.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tabs
              value={taskFilter}
              onValueChange={(v) => setTaskFilter(v as any)}
              className="w-auto"
            >
              <TabsList className="h-8 p-0.5 bg-muted/70 text-xs">
                <TabsTrigger value="ALL" className="h-7 text-xs px-2.5">
                  All ({totalTasks})
                </TabsTrigger>
                <TabsTrigger value="ATTENTION" className="h-7 text-xs px-2.5">
                  Needs Attention ({overdueTasks.length + urgentTasks.length})
                </TabsTrigger>
                <TabsTrigger value="REVIEW" className="h-7 text-xs px-2.5">
                  Needs Review ({reviewTasks})
                </TabsTrigger>
                <TabsTrigger value="PENDING" className="h-7 text-xs px-2.5">
                  In Progress ({pendingTasks})
                </TabsTrigger>
                <TabsTrigger value="COMPLETED" className="h-7 text-xs px-2.5">
                  Completed ({completedTasks})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Card className="border border-border/80 shadow-xs overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[38%] font-semibold text-xs">Task & Program</TableHead>
                  <TableHead className="font-semibold text-xs">Assigned To</TableHead>
                  <TableHead className="font-semibold text-xs">Priority</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle className="size-8 text-emerald-500/40 mb-2" />
                        <p className="text-sm font-medium">No tasks in this list right now</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Everything is caught up.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => {
                    const isOverdue =
                      task.deadline &&
                      isPast(new Date(task.deadline)) &&
                      !isToday(new Date(task.deadline)) &&
                      task.status !== "COMPLETED" &&
                      task.status !== "CANCELLED";

                    // Priority pill
                    let priorityBadge = "border-slate-300 text-slate-700 bg-slate-50";
                    if (task.priority === "URGENT") priorityBadge = "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/20";
                    if (task.priority === "HIGH") priorityBadge = "border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20";
                    if (task.priority === "MEDIUM") priorityBadge = "border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/20";

                    // Status pill
                    let statusBadge = "bg-secondary text-secondary-foreground";
                    if (task.status === "COMPLETED") statusBadge = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
                    if (task.status === "REVIEW") statusBadge = "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300";
                    if (task.status === "PENDING") statusBadge = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

                    return (
                      <TableRow key={task.id} className="hover:bg-muted/40 transition-colors group">
                        <TableCell className="py-3">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-medium text-sm text-foreground hover:text-primary transition-colors block"
                          >
                            {task.title}
                          </Link>
                          {task.project && (
                            <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <FolderKanban className="size-3" />
                              {task.project.name}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6 border border-border">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {task.assignee ? task.assignee.name.charAt(0).toUpperCase() : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-foreground">
                              {task.assignee?.name || "Unassigned"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-[10px] font-semibold ${priorityBadge}`}>
                            {task.priority}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge variant="secondary" className={`text-[10px] font-medium ${statusBadge} border-0`}>
                            {task.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <div className={`text-xs flex items-center justify-end gap-1.5 ${isOverdue ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground"}`}>
                            {isOverdue && <AlertTriangle className="size-3.5 text-red-500" />}
                            <span>
                              {task.deadline ? format(new Date(task.deadline), "MMM d, yyyy") : "No date"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* ── Departments & Recent Activity ──────────────────────────────────── */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Departments */}
        <Card className="lg:col-span-2 border border-border/80 shadow-xs bg-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Departments & Teams
                </CardTitle>
                <CardDescription className="text-xs">
                  Staff members and current workload across each department.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {departments.length} Depts
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="rounded-xl border border-border/70 p-4 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-sm text-foreground block">{dept.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                        Code: {dept.code || "N/A"}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {dept.staffCount} Staff
                    </Badge>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Active tasks assigned:</span>
                    <span className="font-bold text-foreground">{dept.taskCount} Tasks</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-border/80 shadow-xs bg-card flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Latest updates and actions from the team.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {act.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-snug">
                        <strong className="font-semibold">{act.user.name}</strong>{" "}
                        <span className="text-muted-foreground font-normal">
                          {act.action.toLowerCase()}d {act.entityType}
                        </span>{" "}
                        {act.entityName && <strong className="text-foreground truncate">{act.entityName}</strong>}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
