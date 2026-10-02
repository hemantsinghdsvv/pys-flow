"use client";

import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { removeMentor, removeStudent } from "@/features/projects/actions";
import { Button } from "@/components/ui/button";

export function RemovePersonButton({
  projectId,
  userId,
  kind,
}: {
  projectId: string;
  userId: string;
  kind: "mentor" | "student";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:text-destructive"
      disabled={pending}
      aria-label={`Remove ${kind}`}
      onClick={() =>
        startTransition(async () => {
          try {
            if (kind === "mentor") await removeMentor(projectId, userId);
            else await removeStudent(projectId, userId);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to remove");
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
