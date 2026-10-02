"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import type { DailyLogStatus } from "@prisma/client";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { DAILY_LOG_STATUS_LABELS } from "@/config/labels";

export type DailyLogRow = {
  id: string;
  date: string;
  studentName: string;
  studentImage: string | null;
  projectName: string | null;
  hoursWorked: number;
  status: DailyLogStatus;
};

function buildColumns(showStudent: boolean): ColumnDef<DailyLogRow>[] {
  const cols: ColumnDef<DailyLogRow>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date <ArrowUpDown className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.original.date), "d MMM yyyy"),
    },
  ];

  if (showStudent) {
    cols.push({
      accessorKey: "studentName",
      header: "Student",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserAvatar
            name={row.original.studentName}
            image={row.original.studentImage}
            className="size-6"
          />
          <span className="text-sm">{row.original.studentName}</span>
        </div>
      ),
    });
  }

  cols.push(
    {
      accessorKey: "projectName",
      header: "Project",
      cell: ({ row }) =>
        row.original.projectName ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "hoursWorked",
      header: "Hours",
      cell: ({ row }) => `${row.original.hoursWorked}h`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          label={DAILY_LOG_STATUS_LABELS[row.original.status]}
        />
      ),
    }
  );

  return cols;
}

export function DailyLogsTable({
  data,
  showStudent = true,
}: {
  data: DailyLogRow[];
  showStudent?: boolean;
}) {
  const router = useRouter();
  return (
    <DataTable
      columns={buildColumns(showStudent)}
      data={data}
      searchPlaceholder="Search reports..."
      emptyMessage="No daily reports found."
      onRowClick={(row) => router.push(`/daily-logs/${row.id}`)}
    />
  );
}
