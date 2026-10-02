"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { format, isPast } from "date-fns";
import {
  CalendarClock,
  Layers,
  RefreshCw,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Priority, TaskStatus } from '@prisma/client';
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/config/labels";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { cn } from "@/lib/utils";

export type KanbanTask = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  order: number;
  deadline: string | null;
  estimatedHours?: number | null;
  approvalStatus?: string | null;
  projectName: string;
  projectId?: string;
  assignee: {
    id?: string;
    name: string;
    image: string | null;
    role?: string | string;
    designation?: string | null;
  } | null;
  subtaskCount: number;
};

const COLUMNS: TaskStatus[] = [
  "PENDING",
  "REVIEW",
  "COMPLETED",
  "CANCELLED",
];

const COLUMN_CONFIG: Record<
  TaskStatus,
  {
    label: string;
    accent: string;
    headerBg: string;
    boardBg: string;
    badgeBg: string;
    tapeColor: string;
    noteStyle: string;
  }
> = {
  PENDING: {
    label: "Assigned",
    accent: "bg-amber-400",
    headerBg: "border-amber-400/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    boardBg: "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    tapeColor: "bg-amber-200/80 dark:bg-amber-700/80",
    noteStyle: "bg-[#fef9c3] dark:bg-amber-950/80 border-[#fef08a] dark:border-amber-900/60 shadow-amber-900/5",
  },
  REVIEW: {
    label: "Processed / Under Review",
    accent: "bg-purple-400",
    headerBg: "border-purple-400/30 bg-purple-500/10 text-purple-900 dark:text-purple-200",
    boardBg: "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-900/30",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    tapeColor: "bg-purple-200/80 dark:bg-purple-700/80",
    noteStyle: "bg-[#f3e8ff] dark:bg-purple-950/80 border-[#e9d5ff] dark:border-purple-900/60 shadow-purple-900/5",
  },
  COMPLETED: {
    label: "Completed",
    accent: "bg-emerald-400",
    headerBg: "border-emerald-400/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
    boardBg: "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    tapeColor: "bg-emerald-300/60 dark:bg-emerald-400/30 border-emerald-400/40",
    noteStyle:
      "bg-emerald-50/95 dark:bg-emerald-950/70 border-emerald-200/80 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-100",
  },
  CANCELLED: {
    label: "Archived / Other",
    accent: "bg-zinc-400",
    headerBg: "border-zinc-400/30 bg-zinc-500/10 text-zinc-900 dark:text-zinc-200",
    boardBg: "bg-zinc-50/40 dark:bg-zinc-950/20 border-zinc-200/50 dark:border-zinc-900/30",
    badgeBg: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300",
    tapeColor: "bg-zinc-300/60 dark:bg-zinc-400/30 border-zinc-400/40",
    noteStyle:
      "bg-zinc-50/95 dark:bg-zinc-950/70 border-zinc-200/80 dark:border-zinc-800/50 text-zinc-950 dark:text-zinc-100",
  },
};

/** Pseudo-random slight rotation tilt for dynamic sticky-note feel based on string hash */
function getNoteRotation(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const angles = ["-rotate-1", "rotate-0", "rotate-1", "-rotate-0.5", "rotate-0.5"];
  return angles[Math.abs(hash) % angles.length];
}

function StickyNoteCard({ task }: { task: KanbanTask }) {
  const columnConfig = COLUMN_CONFIG[columnOf(task.status)] || COLUMN_CONFIG.PENDING;
  const overdue =
    task.deadline && isPast(new Date(task.deadline)) && task.status !== "COMPLETED";
  const rotationClass = useMemo(() => getNoteRotation(task.id), [task.id]);

  // Urgent tasks get distinct border/accent
  const isUrgent = task.priority === "URGENT" || task.priority === "HIGH";

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border p-3.5 shadow-sm transition-all duration-200",
        columnConfig.noteStyle,
        rotationClass,
        isUrgent && "ring-1 ring-rose-400/40"
      )}
    >
      {/* Sticky Note Top Tape / Pin Highlight */}
      <div
        className={cn(
          "absolute -top-2 left-1/2 h-3.5 w-12 -translate-x-1/2 rounded-xs border shadow-xs backdrop-blur-xs transition-opacity",
          columnConfig.tapeColor
        )}
      />

      {/* Header: Project & Priority Badge */}
      <div className="flex items-center justify-between gap-1 text-xs">
        <span className="truncate max-w-[120px] font-semibold text-[11px] opacity-75">
          {task.projectName}
        </span>
        <div className="flex items-center gap-1.5">
          {task.estimatedHours != null && task.estimatedHours > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-80">
              ⏱️ {task.estimatedHours}h
            </span>
          )}
          {task.approvalStatus === "DECLINED" && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              Declined
            </Badge>
          )}
          <StatusBadge
            status={task.priority}
            label={PRIORITY_LABELS[task.priority]}
          />
        </div>
      </div>

      {/* Task Title */}
      <div className="mt-1.5 flex-1">
        <Link
          href={`/tasks/${task.id}`}
          className="font-bold text-sm leading-snug hover:underline text-foreground block line-clamp-3"
          onClick={(e) => e.stopPropagation()}
        >
          {task.title}
        </Link>
      </div>

      {/* Footer: Assignee, Role Badge, Due Date, Subtask Count */}
      <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-current/10 pt-2 text-xs">
        {/* Assignee & Role */}
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee ? (
            <>
              <UserAvatar
                name={task.assignee.name}
                image={task.assignee.image}
                className="size-5 shrink-0 shadow-xs"
              />
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[11px] font-medium leading-none">
                  {task.assignee.name}
                </span>
                {task.assignee.role && (
                  <span className="truncate text-[9px] uppercase tracking-wider font-semibold opacity-70">
                    {String(task.assignee.role).replace("_", " ")}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-[11px] opacity-60 flex items-center gap-1">
              <UserIcon className="size-3" /> Unassigned
            </span>
          )}
        </div>

        {/* Due Date / Subtasks */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.subtaskCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] opacity-75 font-semibold">
              <Layers className="size-3" />
              {task.subtaskCount}
            </span>
          )}

          {task.deadline && (
            <span
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold",
                overdue ? "text-red-600 dark:text-red-400 font-bold" : "opacity-80"
              )}
            >
              <CalendarClock className="size-3" />
              {format(new Date(task.deadline), "d MMM")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: KanbanTask[];
}) {
  const config = COLUMN_CONFIG[status] || COLUMN_CONFIG.PENDING;

  return (
    <div
      className={cn(
        "flex min-w-[260px] max-w-[340px] flex-1 flex-col rounded-2xl border p-2.5 h-full max-h-full transition-colors",
        config.boardBg
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between rounded-xl border px-3 py-2.5 shadow-xs mb-3",
          config.headerBg
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("size-2.5 shrink-0 rounded-full", config.accent)} />
          <p className="truncate text-xs sm:text-sm font-bold">{config.label}</p>
        </div>
        <span
          className={cn(
            "rounded-lg px-2 py-0.5 text-xs font-extrabold shadow-inner",
            config.badgeBg
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Notes Area */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-1 pt-1 min-h-[140px] scrollbar-thin">
        {tasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-current/20 text-center text-xs opacity-50 font-medium">
            No tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <StickyNoteCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}

function columnOf(status: TaskStatus): TaskStatus {
  return status;
}

export function KanbanBoard({
  initialTasks,
  canMove = true, // Left for prop compatibility if passed, but not used in UI.
}: {
  initialTasks: KanbanTask[];
  canMove?: boolean;
}) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Synchronize when initialTasks prop updates
  useEffect(() => {
    setTasks(initialTasks);
    setLastSynced(new Date());
  }, [initialTasks]);

  // Real-Time Live Sync via Server-Sent Events
  const { isConnected } = useRealtimeTasks((event) => {
    if (event.type === "TASK_MOVED" || event.type === "TASK_UPDATED") {
      if (event.taskId && event.status) {
        const newStatus = event.status as TaskStatus;
        const newOrder = event.order ?? 0;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId
              ? {
                  ...t,
                  status: newStatus,
                  order: newOrder,
                  ...(event.task ? (event.task as Partial<KanbanTask>) : {}),
                }
              : t
          )
        );
        setLastSynced(new Date());
      }
    } else if (event.type === "TASK_CREATED" && event.task) {
      const newTask = event.task as unknown as KanbanTask;
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
      setLastSynced(new Date());
    } else if (event.type === "TASK_DELETED" && event.taskId) {
      setTasks((prev) => prev.filter((t) => t.id !== event.taskId));
      setLastSynced(new Date());
    }
  });

  const byColumn = useMemo(() => {
    const map = new Map<TaskStatus, KanbanTask[]>();
    for (const col of COLUMNS) map.set(col, []);
    for (const task of [...tasks].sort((a, b) => a.order - b.order)) {
      map.get(columnOf(task.status))?.push(task);
    }
    return map;
  }, [tasks]);

  function handleManualRefresh() {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSynced(new Date());
      toast.success("Event track synchronized");
    }, 400);
  }

  return (
    <div className="space-y-4">
      {/* Real-time sync bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/60 backdrop-blur-md px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>{isConnected ? "Live Real-Time Connected" : "Connecting Real-Time…"}</span>
          </div>
          {lastSynced && (
            <span className="hidden sm:inline text-muted-foreground">
              Synced at {lastSynced.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
            Automated Tracking Active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("size-3", isRefreshing && "animate-spin text-primary")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Columns Board */}
      <div className="flex h-[calc(100vh-14.5rem)] w-full gap-3 overflow-x-auto overflow-y-hidden pb-3">
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={byColumn.get(status) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

