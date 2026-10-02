"use client";

import { useTransition } from "react";
import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { acknowledgeTask } from "@/features/workflow/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AcknowledgementStatus = "ON_TIME" | "LATE";

export function AcknowledgeTaskButton({
  taskId,
  taskTitle,
  alreadyAcknowledged,
  acknowledgementStatus,
}: {
  taskId: string;
  taskTitle: string;
  alreadyAcknowledged: boolean;
  acknowledgementStatus?: AcknowledgementStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  if (alreadyAcknowledged) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-green-500" />
        <span className="text-sm text-muted-foreground">Acknowledged</span>
        {acknowledgementStatus && (
          <Badge
            variant={acknowledgementStatus === "ON_TIME" ? "default" : "secondary"}
            className={
              acknowledgementStatus === "ON_TIME"
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-amber-100 text-amber-700 hover:bg-amber-100"
            }
          >
            {acknowledgementStatus === "ON_TIME" ? (
              <><CheckCircle2 className="size-3 mr-1" /> On Time</>
            ) : (
              <><Clock className="size-3 mr-1" /> Late</>
            )}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      disabled={pending}
      className="bg-indigo-600 hover:bg-indigo-700 text-white"
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await acknowledgeTask(taskId);
            const label = result.status === "ON_TIME" ? "On Time ✓" : "Late (after 10 AM)";
            toast.success(`Task acknowledged — ${label}`, {
              description: `"${taskTitle}" has been acknowledged for today.`,
            });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to acknowledge task");
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCircle2 className="size-4" />
      )}
      Acknowledge Task
    </Button>
  );
}
