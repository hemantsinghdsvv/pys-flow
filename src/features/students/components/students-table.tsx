"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { deleteUser } from "@/features/students/actions";

export type StudentRow = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  rollNumber: string | null;
  department: string | null;
  batchName: string | null;
  companyName: string;
  skills: string[];
  isActive: boolean;
};

function DeleteButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteUser(userId);
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
          onClick={(e) => e.stopPropagation()}
          disabled={pending}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate the account and sign them out immediately. The
            user&apos;s data (logs, tasks, attendance) will be preserved but
            they will no longer be able to log in. This action can be reversed
            by support if needed.
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

function buildColumns(canDelete: boolean): ColumnDef<StudentRow>[] {
  const cols: ColumnDef<StudentRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Student <ArrowUpDown className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={row.original.name} image={row.original.image} />
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "rollNumber",
      header: "Roll No.",
      cell: ({ row }) => row.original.rollNumber ?? "—",
    },
    {
      accessorKey: "companyName",
      header: "Company",
    },
    {
      accessorKey: "batchName",
      header: "Batch",
      cell: ({ row }) =>
        row.original.batchName ?? (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      accessorKey: "skills",
      header: "Skills",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex max-w-56 flex-wrap gap-1">
          {row.original.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {row.original.skills.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{row.original.skills.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? "ACTIVE" : "INACTIVE"}
          label={row.original.isActive ? "Active" : "Inactive"}
        />
      ),
    },
  ];

  if (canDelete) {
    cols.push({
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <DeleteButton userId={row.original.userId} name={row.original.name} />
      ),
    });
  }

  return cols;
}

export function StudentsTable({
  data,
  canDelete = false,
}: {
  data: StudentRow[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const columns = buildColumns(canDelete);
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search students..."
      emptyMessage="No students found."
      onRowClick={(row) => router.push(`/students/${row.userId}`)}
    />
  );
}
