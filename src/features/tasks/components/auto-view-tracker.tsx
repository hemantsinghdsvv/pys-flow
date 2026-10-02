"use client";

import { useEffect, useRef } from "react";
import { markTaskAsReview } from "@/features/tasks/actions";
import type { TaskStatus } from "@prisma/client";

interface Props {
  taskId: string;
  status: TaskStatus;
  isAssignee: boolean;
}

export function AutoViewTracker({ taskId, status, isAssignee }: Props) {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current && isAssignee && status === "PENDING") {
      mounted.current = true;
      // Auto-update to REVIEW ("Reviewed") as soon as the assignee opens it
      markTaskAsReview(taskId).catch((err) => {
        console.error("Failed to auto-update task status", err);
      });
    }
  }, [taskId, status, isAssignee]);

  return null;
}
