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
        toast.success(`${selected.length} member(s) assigned to batch`);
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
        <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 border-[#00381F]/30 text-[#00381F] dark:text-[#D9AE29] hover:bg-[#00381F]/5">
          <UserPlus className="size-3.5" /> Assign Members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Members to Batch</DialogTitle>
          <DialogDescription>
            Select members across any level or role (Lead Teachers, Supervisors, Instructors, Staff) to assign to this batch.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All active studio members are already assigned to this batch.
          </p>
        ) : (
          <MultiSelect
            options={options}
            selected={selected}
            onChange={setSelected}
            placeholder="Select members..."
          />
        )}
        <DialogFooter>
          <Button
            onClick={handleAssign}
            disabled={pending || selected.length === 0}
            className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-9 min-w-[120px]"
          >
            {pending && <Loader2 className="size-4 animate-spin mr-1.5" />}
            Assign Members {selected.length > 0 && `(${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
