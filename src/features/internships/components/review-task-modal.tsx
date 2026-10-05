"use client";

import { useState, useTransition } from "react";
import { Loader2, Star, CheckCircle2, AlertTriangle, XCircle, Award } from "lucide-react";
import { toast } from "sonner";
import { ReviewVerdict } from "@prisma/client";
import { reviewInternTask } from "@/features/internships/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const VERDICT_OPTIONS: {
  value: ReviewVerdict;
  label: string;
  desc: string;
  icon: typeof CheckCircle2;
  color: string;
  activeBg: string;
}[] = [
  {
    value: "APPROVED",
    label: "Approve & Grade",
    desc: "Passes requirement and marks task complete",
    icon: CheckCircle2,
    color: "text-emerald-700 dark:text-emerald-400",
    activeBg: "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200",
  },
  {
    value: "REWORK",
    label: "Request Rework",
    desc: "Send back with alignment / practice corrections",
    icon: AlertTriangle,
    color: "text-amber-700 dark:text-amber-400",
    activeBg: "border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
  },
  {
    value: "REJECTED",
    label: "Decline",
    desc: "Does not meet basic safety or curriculum standards",
    icon: XCircle,
    color: "text-rose-700 dark:text-rose-400",
    activeBg: "border-rose-600 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200",
  },
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  5: "5/5 — Exceptional & Masterful (Exceeds expectations)",
  4: "4/5 — Proficient & Confident (Meets high standard)",
  3: "3/5 — Satisfactory & Competent (Safe execution)",
  2: "2/5 — Developing (Needs focused alignment practice)",
  1: "1/5 — Below Standard (Requires direct supervision)",
};

interface ReviewTaskModalProps {
  task: {
    id: string;
    title: string;
    assignee?: { id: string; name: string } | null;
    project?: { name: string } | null;
    latestReview?: {
      verdict: ReviewVerdict;
      rating?: number | null;
      feedback: string;
    } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ReviewTaskModal({
  task,
  open,
  onOpenChange,
  onSuccess,
}: ReviewTaskModalProps) {
  const [verdict, setVerdict] = useState<ReviewVerdict>(
    task?.latestReview?.verdict || "APPROVED"
  );
  const [rating, setRating] = useState<number>(
    task?.latestReview?.rating || 5
  );
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>(
    task?.latestReview?.feedback || ""
  );
  const [pending, startTransition] = useTransition();

  if (!task) return null;
  const currentTask = task;

  function handleSubmit() {
    if (!feedback.trim()) {
      toast.error("Please provide evaluation remarks or feedback for the intern.");
      return;
    }

    startTransition(async () => {
      try {
        await reviewInternTask({
          taskId: currentTask.id,
          verdict,
          rating,
          feedback: feedback.trim(),
        });
        toast.success(
          `Review submitted for ${currentTask.assignee?.name || "intern"} (${verdict === "APPROVED" ? "Approved" : verdict === "REWORK" ? "Rework" : "Declined"})`
        );
        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit review");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00381F] dark:text-[#D9AE29] mb-1">
            <Award className="size-4" /> Supervisor Practical Evaluation
          </div>
          <DialogTitle className="font-serif text-xl">
            Review: {task.title}
          </DialogTitle>
          <DialogDescription>
            {task.assignee ? (
              <span>
                Evaluating intern <strong className="text-foreground">{task.assignee.name}</strong>
                {task.project ? ` · Initiative: ${task.project.name}` : ""}
              </span>
            ) : (
              "Evaluate intern task completion, posture safety, and curriculum mastery."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Verdict Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Evaluation Verdict:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {VERDICT_OPTIONS.map((opt) => {
                const isSelected = verdict === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVerdict(opt.value)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? opt.activeBg + " shadow-xs font-medium"
                        : "border-border/60 hover:border-border hover:bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                      <Icon className="size-4 shrink-0" />
                      <span>{opt.label}</span>
                    </div>
                    <span className="text-[11px] leading-tight opacity-80">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating / Score (1 to 5 Stars) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Score / Practical Rating:
              </label>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {RATING_DESCRIPTIONS[hoverRating || rating]}
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isFilled = (hoverRating || rating) >= starVal;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(starVal)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${starVal} stars`}
                  >
                    <Star
                      className={`size-7 ${
                        isFilled
                          ? "fill-amber-400 text-amber-500 drop-shadow-xs"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-auto text-sm font-bold text-amber-600 dark:text-amber-400">
                {rating} / 5 ★
              </span>
            </div>
          </div>

          {/* Detailed Supervisor Feedback & Comments */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Supervisor Remarks & Guidance:
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Clear alignment cues and breath pacing in Surya Namaskar. In Standing Forward Bend, remind students to micro-bend knees to protect hamstrings..."
              className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              This feedback will appear transparently on the intern&apos;s score card and task history.
            </p>
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
            disabled={pending || !feedback.trim()}
            className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Saving Review...</span>
              </>
            ) : (
              <span>Save & Dispatch Evaluation</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
