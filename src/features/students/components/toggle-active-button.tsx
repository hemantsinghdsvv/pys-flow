"use client";

import { useTransition } from "react";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { setStudentActive } from "@/features/students/actions";
import { Button } from "@/components/ui/button";

export function ToggleActiveButton({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await setStudentActive(userId, !isActive);
            toast.success(isActive ? "Student deactivated" : "Student activated");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isActive ? (
        <UserX className="size-4" />
      ) : (
        <UserCheck className="size-4" />
      )}
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
