"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceStatus } from "@prisma/client";
import { markAttendance, markAllPresent } from "@/features/attendance/actions";
import { ATTENDANCE_STATUSES } from "@/features/attendance/schemas";
import { ATTENDANCE_STATUS_LABELS } from "@/config/labels";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AttendanceRow = {
  userId: string;
  name: string;
  image: string | null;
  rollNumber: string | null;
  status: AttendanceStatus | null;
};

function StatusSelect({
  userId,
  date,
  status,
}: {
  userId: string;
  date: string;
  status: AttendanceStatus | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    startTransition(async () => {
      try {
        await markAttendance({
          userId,
          date,
          status: value as AttendanceStatus,
        });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  return (
    <Select value={status ?? undefined} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="h-8 w-36">
        <SelectValue placeholder="Not marked" />
      </SelectTrigger>
      <SelectContent>
        {ATTENDANCE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {ATTENDANCE_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MarkAllPresentButton({
  date,
  companyId,
  unmarkedCount,
}: {
  date: string;
  companyId?: string | null;
  unmarkedCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        const { count } = await markAllPresent(date, companyId);
        if (count === 0) {
          toast.info("All students are already marked.");
        } else {
          toast.success(`${count} student${count !== 1 ? "s" : ""} marked as Present.`);
        }
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to mark all present");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || unmarkedCount === 0}
          id="mark-all-present-btn"
          className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserCheck className="size-4" />
          )}
          {pending ? "Marking…" : `Mark All Present${unmarkedCount > 0 ? ` (${unmarkedCount})` : ""}`}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark all present?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark <strong>{unmarkedCount}</strong> unmarked student
            {unmarkedCount !== 1 ? "s" : ""} as <strong>Present</strong> for
            today. Students who already have a status set will not be changed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Yes, mark all present
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AttendanceBoard({
  rows,
  date,
  canManage,
  companyId,
}: {
  rows: AttendanceRow[];
  date: string;
  canManage: boolean;
  companyId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      (r.rollNumber ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const unmarkedCount = rows.filter((r) => r.status === null).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students..."
            className="pl-8"
          />
        </div>
        {canManage && (
          <MarkAllPresentButton
            date={date}
            companyId={companyId}
            unmarkedCount={unmarkedCount}
          />
        )}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Roll No.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={r.name} image={r.image} />
                      <span className="font-medium">{r.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{r.rollNumber ?? "—"}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <StatusSelect
                        userId={r.userId}
                        date={date}
                        status={r.status}
                      />
                    ) : r.status ? (
                      <StatusBadge
                        status={r.status}
                        label={ATTENDANCE_STATUS_LABELS[r.status]}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not marked
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
