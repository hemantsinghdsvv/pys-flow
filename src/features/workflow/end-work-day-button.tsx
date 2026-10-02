"use client";

import { useTransition } from "react";
import { LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { endWorkDay } from "@/features/workflow/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function EndWorkDayButton({ alreadyEnded }: { alreadyEnded: boolean }) {
  const [pending, startTransition] = useTransition();

  if (alreadyEnded) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-green-500" />
        Work day ended
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          End Work Day
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End your work day?</AlertDialogTitle>
          <AlertDialogDescription>
            This will record your logout time and calculate total working hours
            for today. Make sure you have submitted your daily report before
            ending your work day.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const result = await endWorkDay();
                  const hours = Math.floor(result.workingMinutes / 60);
                  const mins = result.workingMinutes % 60;
                  toast.success("Work day ended!", {
                    description: `Total working time: ${hours}h ${mins}m`,
                  });
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Failed to end work day"
                  );
                }
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            End Work Day
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
