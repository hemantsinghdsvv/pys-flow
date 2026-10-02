"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeTeamMember } from "@/features/team/actions";

interface DeleteMemberButtonProps {
  userId: string;
  userName: string;
}

export function DeleteMemberButton({ userId, userName }: DeleteMemberButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team roster?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await removeTeamMember(userId);
        toast.success(`${userName} removed from team roster.`);
      } catch (err: any) {
        toast.error(err.message || "Failed to remove member");
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleDelete}
      className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      title={`Remove ${userName}`}
    >
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
