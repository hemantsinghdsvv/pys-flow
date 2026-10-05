"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { assignMentors, assignStudents } from "@/features/projects/actions";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/shared/multi-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AssignPeopleDialog({
  projectId,
  kind,
  options,
}: {
  projectId: string;
  kind: "mentor" | "student";
  options: MultiSelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function handleAssign() {
    if (selected.length === 0) return;
    startTransition(async () => {
      try {
        if (kind === "mentor") await assignMentors(projectId, selected);
        else await assignStudents(projectId, selected);
        toast.success(
          `${selected.length} ${kind === "mentor" ? "team lead(s)" : "staff member(s)"} assigned`
        );
        setSelected([]);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to assign");
      }
    });
  }

  const kindLabel = kind === "mentor" ? "team leads" : "staff members";
  const kindTitle = kind === "mentor" ? "Team Leads & Supervisors" : "Staff Members";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="size-4" />
          Add {kindLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {kindTitle}</DialogTitle>
          <DialogDescription>
            Select {kind === "mentor" ? "Level 2 team leads / supervisors" : "Level 3 staff members"} to assign to this project.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Everyone available is already assigned.
          </p>
        ) : (
          <MultiSelect
            options={options}
            selected={selected}
            onChange={setSelected}
            placeholder={`Select ${kindLabel}...`}
          />
        )}
        <DialogFooter>
          <Button
            onClick={handleAssign}
            disabled={pending || selected.length === 0}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Assign {selected.length > 0 && `(${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
