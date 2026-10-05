"use client";

import { useState, useTransition } from "react";
import { Loader2, SendHorizontal, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { submitInternTaskForReview } from "@/features/internships/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubmitTaskModalProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SubmitTaskModal({
  task,
  open,
  onOpenChange,
  onSuccess,
}: SubmitTaskModalProps) {
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  if (!task) return null;
  const currentTask = task;

  function handleSubmit() {
    startTransition(async () => {
      try {
        await submitInternTaskForReview(currentTask.id, notes);
        toast.success("Task submitted for supervisor evaluation!");
        setNotes("");
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit task");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00381F] dark:text-[#D9AE29] mb-1">
            <CheckSquare className="size-4" /> Ready for Review
          </div>
          <DialogTitle className="font-serif text-lg">
            Submit: {task.title}
          </DialogTitle>
          <DialogDescription>
            Notify your supervisor that you have completed this practical task or sequence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Completion Notes / Observations (Optional):
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Practiced 40-minute morning session with fellow trainees; practiced voice cues and breath intervals."
              className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <SendHorizontal className="size-4" />
                <span>Submit for Evaluation</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
