"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { toast } from "sonner";
import { approveTask, declineTask } from "@/features/tasks/actions";
import { Button } from "@/components/ui/button";
import { Check, X, CheckCircle2 } from "lucide-react";

export function RealtimeListener({ role, userId }: { role: string; userId: string }) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useRealtimeTasks((event) => {
    if (event.type === "PERMISSION_CHANGED") {
      // Always refresh every connected user when permissions change.
      // We cannot know which roles/users are affected client-side without a DB call,
      // so the safest and correct approach is a universal refresh with debouncing.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 500); // Debounce to prevent network abort errors on rapid toggles
    }

    if (event.type === "TASK_APPROVAL_REQUESTED" && role === "MANAGER" && event.taskId && event.task) {
      toast.custom((t) => (
        <div className="flex w-full flex-col gap-4 rounded-xl border border-amber-200 bg-white p-5 text-sm shadow-xl dark:border-amber-900/50 dark:bg-slate-950">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-amber-700 dark:text-amber-400 text-base">Approval Required</p>
              <p className="text-muted-foreground leading-snug text-xs">
                <span className="font-medium text-foreground">{String(event.task?.createdBy)}</span> ({event.role}) wants to create a new task:
              </p>
              <div className="font-medium text-foreground italic mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-md border text-xs line-clamp-2">
                &quot;{String(event.task?.title)}&quot;
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">
                {new Date(String(event.task?.createdAt)).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              className="w-full gap-1"
              onClick={async () => {
                toast.dismiss(t);
                try {
                  await approveTask(event.taskId!);
                  toast.success("Task approved successfully");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to approve task");
                }
              }}
            >
              <Check className="size-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="w-full gap-1"
              onClick={async () => {
                toast.dismiss(t);
                try {
                  await declineTask(event.taskId!);
                  toast.success("Task declined");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to decline task");
                }
              }}
            >
              <X className="size-4" />
              Decline
            </Button>
          </div>
        </div>
      ), { duration: 15000 });
    }

    if (event.type === "PROPOSAL_APPROVAL_REQUESTED" && role === "MANAGER" && event.taskId && event.task) {
      toast.custom((t) => (
        <div className="flex w-full flex-col gap-4 rounded-xl border border-blue-200 bg-white p-5 text-sm shadow-xl dark:border-blue-900/50 dark:bg-slate-950">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-blue-700 dark:text-blue-400 text-base">New Proposal</p>
              <p className="text-muted-foreground leading-snug text-xs">
                <span className="font-medium text-foreground">{String(event.task?.createdBy)}</span> ({event.role}) submitted a proposal:
              </p>
              <div className="font-medium text-foreground italic mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-md border text-xs line-clamp-2">
                &quot;{String(event.task?.title)}&quot;
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">
                {new Date(String(event.task?.createdAt)).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              className="w-full gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                toast.dismiss(t);
                router.push(`/propose/${event.taskId}`);
              }}
            >
              Review Proposal
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1"
              onClick={() => toast.dismiss(t)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ), { duration: 15000 });
    }

    if (event.type === "TASK_DECLINED" && event.userId === userId) {
      toast.error("Your task was declined", {
        description: "A super admin has declined your task. It can no longer be edited.",
        duration: 8000,
      });
    }

    if (event.type === "TASK_APPROVED" || event.type === "TASK_DECLINED") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 500);
    }
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return null;
}
