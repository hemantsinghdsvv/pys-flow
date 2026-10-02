"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markTaskAsReview, completeTask, cancelTask } from "@/features/tasks/actions";
import { toast } from "sonner";
import type { TaskStatus } from "@prisma/client";

export function TaskStateButtons({
  taskId,
  status,
  isAssignee,
  canEdit,
}: {
  taskId: string;
  status: TaskStatus;
  isAssignee: boolean;
  canEdit: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAction = async (actionFn: () => Promise<void>, successMsg: string) => {
    try {
      setIsUpdating(true);
      await actionFn();
      toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAssignee || status === "COMPLETED" || status === "CANCELLED") {
    return null;
  }

  return (
    <div className="flex w-full justify-between items-center mt-4">
      <Button
        onClick={() => handleAction(() => completeTask(taskId), "Task completed")}
        disabled={isUpdating}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <CheckCircle2 className="mr-2 size-4" />
        {isUpdating ? "Processing..." : "Complete Task"}
      </Button>

      <Button
        onClick={() => handleAction(() => cancelTask(taskId), "Task cancelled")}
        disabled={isUpdating}
        variant="destructive"
      >
        <XCircle className="mr-2 size-4" />
        {isUpdating ? "Processing..." : "Cancel"}
      </Button>
    </div>
  );
}
