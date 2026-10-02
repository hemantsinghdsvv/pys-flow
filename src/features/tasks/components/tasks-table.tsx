"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import type { TaskStatus, Priority } from "@prisma/client";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/config/labels";

export type TaskRow = {
  id: string;
  title: string;
  projectName: string;
  status: TaskStatus;
  priority: Priority;
  assigneeName: string | null;
  assigneeImage: string | null;
  deadline: string | null;
  subtaskCount: number;
};

const columns: ColumnDef<TaskRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Task <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        {row.original.subtaskCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {row.original.subtaskCount} subtask
            {row.original.subtaskCount > 1 ? "s" : ""}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "projectName",
    header: "Project",
  },
  {
    accessorKey: "assigneeName",
    header: "Assignee",
    cell: ({ row }) =>
      row.original.assigneeName ? (
        <div className="flex items-center gap-2">
          <UserAvatar
            name={row.original.assigneeName}
            image={row.original.assigneeImage}
            className="size-6"
          />
          <span className="text-sm">{row.original.assigneeName}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.priority}
        label={PRIORITY_LABELS[row.original.priority]}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.status}
        label={TASK_STATUS_LABELS[row.original.status]}
      />
    ),
  },
  {
    accessorKey: "deadline",
    header: "Deadline",
    cell: ({ row }) =>
      row.original.deadline ? (
        format(new Date(row.original.deadline), "d MMM yyyy")
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function TasksTable({ data }: { data: TaskRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search tasks..."
      emptyMessage="No tasks found."
      onRowClick={(row) => router.push(`/tasks/${row.id}`)}
    />
  );
}
