"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  BookOpen,
  CalendarCheck,
  ConciergeBell,
  Banknote,
  Megaphone,
  PersonStanding,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { assignEventTasks } from "@/features/propose/actions";

export type StaffUser = {
  id: string;
  name: string;
  designation: string | null;
  orgRoleName: string | null;
};

type TaskRole = {
  key:
    | "teacherUserId"
    | "schedulerUserId"
    | "frontDeskUserId"
    | "financeUserId"
    | "opsUserId"
    | "internUserId";
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const TASK_ROLES: TaskRole[] = [
  {
    key: "teacherUserId",
    label: "Curriculum & Teaching",
    description: "Syllabus, asana sequences & handouts",
    icon: <BookOpen className="size-4" />,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    key: "schedulerUserId",
    label: "Scheduling & Space",
    description: "Timetable, studio booking & prop setup",
    icon: <CalendarCheck className="size-4" />,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    key: "frontDeskUserId",
    label: "Front Desk & Welcome",
    description: "Attendee check-in, roster & welcome protocol",
    icon: <ConciergeBell className="size-4" />,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    key: "financeUserId",
    label: "Finance & Accounts",
    description: "Fee collection, ledger & expense tracking",
    icon: <Banknote className="size-4" />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    key: "opsUserId",
    label: "Studio Marketing",
    description: "Posters, WhatsApp broadcast & social media",
    icon: <Megaphone className="size-4" />,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  {
    key: "internUserId",
    label: "Assistant Instruction",
    description: "Live demonstration & posture adjustments",
    icon: <PersonStanding className="size-4" />,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
];

const UNASSIGNED = "__UNASSIGNED__";

export function AssignTasksDialog({
  open,
  onClose,
  proposalId,
  projectId,
  eventTitle,
  staffUsers,
}: {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  projectId: string;
  eventTitle: string;
  staffUsers: StaffUser[];
}) {
  const [pending, startTransition] = useTransition();
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  function handleChange(key: string, value: string) {
    setAssignments((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await assignEventTasks({
          proposalId,
          projectId,
          teacherUserId: assignments.teacherUserId && assignments.teacherUserId !== UNASSIGNED ? assignments.teacherUserId : null,
          schedulerUserId: assignments.schedulerUserId && assignments.schedulerUserId !== UNASSIGNED ? assignments.schedulerUserId : null,
          frontDeskUserId: assignments.frontDeskUserId && assignments.frontDeskUserId !== UNASSIGNED ? assignments.frontDeskUserId : null,
          financeUserId: assignments.financeUserId && assignments.financeUserId !== UNASSIGNED ? assignments.financeUserId : null,
          opsUserId: assignments.opsUserId && assignments.opsUserId !== UNASSIGNED ? assignments.opsUserId : null,
          internUserId: assignments.internUserId && assignments.internUserId !== UNASSIGNED ? assignments.internUserId : null,
        });
        toast.success("Tasks assigned! Team members have been notified.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to assign tasks");
      }
    });
  }

  const assignedCount = Object.values(assignments).filter(
    (v) => v && v !== UNASSIGNED
  ).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-[#00381F]/10">
              <Users className="size-4 text-[#00381F]" />
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold uppercase">
              Task Assignment
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold font-serif">
            Assign Tasks for &ldquo;{eventTitle}&rdquo;
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select a staff member for each task. You can leave any role
            unassigned — those tasks will still be created but shown as
            unassigned on the Kanban board.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/60 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
          <span>
            <span className="font-semibold text-foreground">{assignedCount}</span> of{" "}
            <span className="font-semibold">{TASK_ROLES.length}</span> tasks assigned
          </span>
          {assignedCount === 0 && (
            <>
              <AlertCircle className="size-3.5 text-amber-500 shrink-0 ml-2" />
              <span className="text-amber-600">
                Assign at least one task before submitting
              </span>
            </>
          )}
        </div>

        {/* Role Assignment Grid */}
        <div className="space-y-3">
          {TASK_ROLES.map((role) => {
            const selectedId = assignments[role.key];
            const selectedUser = staffUsers.find((u) => u.id === selectedId);

            return (
              <div
                key={role.key}
                className={`rounded-xl border p-3.5 transition-all ${
                  selectedId && selectedId !== UNASSIGNED
                    ? "border-[#00381F]/30 bg-[#00381F]/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Role Icon */}
                  <div
                    className={`p-2 rounded-lg border shrink-0 mt-0.5 ${role.color}`}
                  >
                    {role.icon}
                  </div>

                  {/* Role Info + Select */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div>
                        <p className="font-semibold text-sm text-foreground leading-tight">
                          {role.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {role.description}
                        </p>
                      </div>
                      {selectedId && selectedId !== UNASSIGNED && (
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      )}
                    </div>

                    <Select
                      value={selectedId || ""}
                      onValueChange={(v) => handleChange(role.key, v)}
                    >
                      <SelectTrigger className="w-full h-9 text-sm mt-1">
                        <SelectValue placeholder="— Select staff member —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>
                          <span className="text-muted-foreground italic">
                            Leave unassigned
                          </span>
                        </SelectItem>
                        {staffUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{u.name}</span>
                              {(u.orgRoleName || u.designation) && (
                                <span className="text-[11px] text-muted-foreground">
                                  {u.orgRoleName || u.designation}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedUser && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        {selectedUser.name} will be notified via notification
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pending}
            className="bg-[#00381F] hover:bg-[#0A4A2B] text-white font-semibold gap-2"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {pending ? "Assigning Tasks…" : "Confirm & Assign Tasks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
