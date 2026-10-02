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
        toast.success(`${selected.length} ${kind}(s) assigned`);
        setSelected([]);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to assign");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="size-4" />
          Add {kind === "mentor" ? "mentors" : "students"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Assign {kind === "mentor" ? "mentors" : "students"}
          </DialogTitle>
          <DialogDescription>
            Only {kind === "mentor" ? "mentors" : "students"} from this
            project&apos;s company are listed.
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
            placeholder={`Select ${kind}s...`}
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
