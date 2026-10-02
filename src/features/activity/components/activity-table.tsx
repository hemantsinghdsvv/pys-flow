"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import type { ActivityAction } from "@prisma/client";
import { DataTable } from "@/components/shared/data-table";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";

export type ActivityRow = {
  id: string;
  userName: string;
  userImage: string | null;
  action: ActivityAction;
  entityType: string;
  entityName: string | null;
  createdAt: string;
};

const ACTION_VARIANT: Record<string, string> = {
  CREATE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SUBMIT: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  APPROVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  STATUS_CHANGE: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ASSIGN: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  REVIEW: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  COMMENT: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  UPLOAD: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  REJECT: "bg-red-500/10 text-red-600 border-red-500/20",
};

function humanize(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

const columns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: "userName",
    header: "User",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <UserAvatar
          name={row.original.userName}
          image={row.original.userImage}
          className="size-6"
        />
        <span className="text-sm">{row.original.userName}</span>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={ACTION_VARIANT[row.original.action] ?? ""}
      >
        {humanize(row.original.action)}
      </Badge>
    ),
  },
  {
    accessorKey: "entityType",
    header: "Entity",
    cell: ({ row }) => (
      <div className="text-sm">
        <span className="font-medium">{row.original.entityType}</span>
        {row.original.entityName && (
          <span className="text-muted-foreground">
            {" "}
            · {row.original.entityName}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "d MMM yyyy, HH:mm"),
  },
];

export function ActivityTable({ data }: { data: ActivityRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search activity..."
      emptyMessage="No activity recorded yet."
    />
  );
}
