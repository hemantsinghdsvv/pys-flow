"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/config/labels";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteStaffUser } from "@/features/mentors/actions";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  companyName: string | null;
  designation: string | null;
  projectCount: number;
  isActive: boolean;
};

function DeleteButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteStaffUser(userId);
        toast.success(`${name} has been deleted.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete user");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={pending}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate the account and sign them out immediately.
            Their activity history will be preserved. This action can be
            reversed by support if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? "Deleting…" : "Delete user"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MentorsTable({
  data,
  canDelete = false,
}: {
  data: StaffRow[];
  canDelete?: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Status</TableHead>
            {canDelete && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canDelete ? 7 : 6}
                className="h-24 text-center text-muted-foreground"
              >
                No staff users yet.
              </TableCell>
            </TableRow>
          ) : (
            data.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={member.name} image={member.image} />
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{ROLE_LABELS[member.role]}</TableCell>
                <TableCell>{member.companyName ?? "—"}</TableCell>
                <TableCell>{member.designation ?? "—"}</TableCell>
                <TableCell>{member.projectCount}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={member.isActive ? "ACTIVE" : "INACTIVE"}
                    label={member.isActive ? "Active" : "Inactive"}
                  />
                </TableCell>
                {canDelete && (
                  <TableCell>
                    <DeleteButton userId={member.id} name={member.name} />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
