"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBatch } from "@/features/batches/actions";
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

export function DeleteBatchButton({
  batchId,
  batchName,
}: {
  batchId: string;
  batchName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" aria-label="Delete batch">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {batchName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The batch is soft-deleted; students remain but are no longer
            grouped under it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await deleteBatch(batchId);
                } catch (err) {
                  if (
                    err instanceof Error &&
                    err.message.includes("NEXT_REDIRECT")
                  )
                    throw err;
                  toast.error(
                    err instanceof Error ? err.message : "Failed to delete"
                  );
                }
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Delete batch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
