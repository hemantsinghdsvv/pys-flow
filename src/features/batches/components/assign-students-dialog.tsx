"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { assignStudentsToBatch } from "@/features/batches/actions";
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

export function AssignStudentsDialog({
  batchId,
  options,
}: {
  batchId: string;
  options: MultiSelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function handleAssign() {
    if (selected.length === 0) return;
    startTransition(async () => {
      try {
        await assignStudentsToBatch(batchId, selected);
        toast.success(`${selected.length} student(s) assigned`);
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
          <UserPlus className="size-4" /> Assign students
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign students</DialogTitle>
          <DialogDescription>
            Students of this company who are not in any batch yet.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All students of this company are already assigned to a batch.
          </p>
        ) : (
          <MultiSelect
            options={options}
            selected={selected}
            onChange={setSelected}
            placeholder="Select students..."
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
