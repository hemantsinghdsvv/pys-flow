"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProposal } from "@/features/propose/actions";
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

export function DeleteProposalButton({
  proposalId,
  proposalTitle,
}: {
  proposalId: string;
  proposalTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" aria-label="Delete proposal">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{proposalTitle}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This proposal will be removed. Associated reviews will be preserved in the archive.
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
                  await deleteProposal(proposalId);
                  toast.success("Proposal deleted");
                } catch (err) {
                  if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
                  toast.error(err instanceof Error ? err.message : "Failed to delete");
                }
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Delete proposal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
