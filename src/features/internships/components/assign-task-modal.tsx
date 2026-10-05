"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Users, User, Calendar, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Priority } from "@prisma/client";
import { assignBatchTask, assignIndividualInternTask } from "@/features/internships/actions";
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

interface AssignTaskModalProps {
  batchId: string;
  batchName: string;
  interns: { id: string; name: string; email: string }[];
  projects: { id: string; name: string }[];
  trigger?: React.ReactNode;
  initialInternId?: string;
  onSuccess?: () => void;
}

export function AssignTaskModal({
  batchId,
  batchName,
  interns,
  projects,
  trigger,
  initialInternId,
  onSuccess,
}: AssignTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<"BATCH" | "INDIVIDUAL">(
    initialInternId ? "INDIVIDUAL" : "BATCH"
  );
  const [selectedInternId, setSelectedInternId] = useState(initialInternId || (interns[0]?.id || ""));
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [estimatedHours, setEstimatedHours] = useState<string>("3");
  const [deadline, setDeadline] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    startTransition(async () => {
      try {
        if (assignTarget === "BATCH") {
          const res = await assignBatchTask({
            batchId,
            projectId: projectId || undefined,
            title: title.trim(),
            description: description.trim() || undefined,
            estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
            priority,
            deadline: deadline || undefined,
          });
          toast.success(`Task dispatched to ${res.count} intern(s) in ${batchName}!`);
        } else {
          await assignIndividualInternTask({
            internUserId: selectedInternId,
            batchId,
            projectId: projectId || undefined,
            title: title.trim(),
            description: description.trim() || undefined,
            estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
            priority,
            deadline: deadline || undefined,
          });
          const targetIntern = interns.find((i) => i.id === selectedInternId);
          toast.success(`Task assigned to ${targetIntern?.name || "intern"}!`);
        }

        setTitle("");
        setDescription("");
        setOpen(false);
        onSuccess?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to assign task");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5 shadow-xs">
            <Plus className="size-4" /> Assign Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00381F] dark:text-[#D9AE29] mb-1">
            <Plus className="size-4" /> Cohort Task Assignment
          </div>
          <DialogTitle className="font-serif text-xl">
            Assign Practical Yoga Task
          </DialogTitle>
          <DialogDescription>
            Dispatch a curriculum task to all interns in <strong className="text-foreground">{batchName}</strong> or a specific trainee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target: Entire Batch vs Individual */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Assignment Mode:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignTarget("BATCH")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  assignTarget === "BATCH"
                    ? "border-[#00381F] bg-[#00381F] text-[#F5EFE5] dark:border-[#D9AE29] dark:bg-[#D9AE29] dark:text-[#1E1E1E]"
                    : "border-input bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="size-3.5" /> Entire Batch Cohort ({interns.length})
              </button>
              <button
                type="button"
                onClick={() => setAssignTarget("INDIVIDUAL")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  assignTarget === "INDIVIDUAL"
                    ? "border-[#00381F] bg-[#00381F] text-[#F5EFE5] dark:border-[#D9AE29] dark:bg-[#D9AE29] dark:text-[#1E1E1E]"
                    : "border-input bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="size-3.5" /> Single Intern
              </button>
            </div>
          </div>

          {assignTarget === "INDIVIDUAL" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Select Intern:
              </label>
              <select
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              >
                {interns.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Linked Initiative / Project:
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Task Title:
            </label>
            <input
              type="text"
              placeholder="e.g. Asana Alignment & Breath Synchronization Practice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Practical Instructions & Deliverables:
            </label>
            <textarea
              rows={3}
              placeholder="Detail the sequence requirements, duration, alignment checkpoints, or partner adjustments..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
            />
          </div>

          {/* Priority & Estimated Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Priority:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Estimated Hours:
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Due Date:
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !title.trim()}
            className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <span>Dispatch Task</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
