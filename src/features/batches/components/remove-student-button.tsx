"use client";

import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { removeStudentFromBatch } from "@/features/batches/actions";
import { Button } from "@/components/ui/button";

export function RemoveStudentButton({
  batchId,
  profileId,
}: {
  batchId: string;
  profileId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      disabled={pending}
      aria-label="Remove from batch"
      onClick={() =>
        startTransition(async () => {
          try {
            await removeStudentFromBatch(batchId, profileId);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to remove"
            );
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <X className="size-3.5" />
      )}
    </Button>
  );
}
