"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveTask, declineTask } from "@/features/tasks/actions";
import { toast } from "sonner";

export function TaskApprovalButtons({ taskId }: { taskId: string }) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await approveTask(taskId);
      toast.success("Task approved and is now active.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve task.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsDeclining(true);
      await declineTask(taskId);
      toast.success("Task declined.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline task.");
    } finally {
      setIsDeclining(false);
    }
  };

  return null;
}
