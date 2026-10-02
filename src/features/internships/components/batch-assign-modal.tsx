"use client";

import { useState, useTransition } from "react";
import { Loader2, Users, Clock, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Priority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignBatchTask } from "@/features/internships/actions";

export function BatchAssignModal({
  batches,
}: {
  batches: { id: string; name: string; studentCount: number }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [batchId, setBatchId] = useState(batches[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      toast.error("Please select a batch.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please provide a task title.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await assignBatchTask({
          batchId,
          title,
          description,
          estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
          priority,
          deadline: deadline || undefined,
        });

        toast.success(`Task dispatched to all ${res.count} interns in batch!`);
        setOpen(false);
        setTitle("");
        setDescription("");
        setEstimatedHours("");
        setDeadline("");
      } catch (err: any) {
        toast.error(err.message || "Failed to assign batch task");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] font-medium shadow-sm">
          <Users className="size-4 mr-2 text-[#D9AE29]" />
          Assign Task to Whole Batch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <Sparkles className="size-5 text-[#D9AE29]" />
            CEO Batch Task Dispatcher
          </DialogTitle>
          <DialogDescription className="text-xs">
            Quickly assign a synchronized operational or curriculum task to every intern in a batch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-sm">
          {/* Target Batch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Batch
            </label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.studentCount} interns)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Task Title
            </label>
            <Input
              required
              placeholder="e.g. Asana Alignment & Sanskrit Vocabulary Journal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Estimated Hours & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estimated Hours
              </label>
              <Input
                type="number"
                step="0.5"
                placeholder="e.g. 3.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Priority
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timeline Due Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Timeline Deadline
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Instructions & Deliverables
            </label>
            <Textarea
              rows={3}
              placeholder="Detailed guidelines for the interns to complete this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#00381F] hover:bg-[#0A4A2B] text-white"
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Dispatch to All Interns
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
