"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus, Clock, AlertCircle } from "lucide-react";
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
import { assignIndividualInternTask } from "@/features/internships/actions";

export function IndividualAssignModal({
  interns,
}: {
  interns: { id: string; name: string; email: string; batchName?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [internUserId, setInternUserId] = useState(interns[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internUserId) {
      toast.error("Please select an intern.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please provide a task title.");
      return;
    }

    startTransition(async () => {
      try {
        await assignIndividualInternTask({
          internUserId,
          title,
          description,
          estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
          priority,
          deadline: deadline || undefined,
        });

        toast.success("Task assigned personally to intern!");
        setOpen(false);
        setTitle("");
        setDescription("");
        setEstimatedHours("");
        setDeadline("");
      } catch (err: any) {
        toast.error(err.message || "Failed to assign task");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-border hover:bg-muted font-medium">
          <UserPlus className="size-4 mr-2 text-indigo-600" />
          Assign Personal Intern Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif font-bold text-foreground">
            Assign Personal Task to Intern
          </DialogTitle>
          <DialogDescription className="text-xs">
            Directly delegate a specialized operational or mentoring task to a specific intern.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-sm">
          {/* Target Intern */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Intern
            </label>
            <Select value={internUserId} onValueChange={setInternUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an intern" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {interns.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} {i.batchName ? `(${i.batchName})` : ""}
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
              placeholder="e.g. Studio Opening & Props Inventory Audit"
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
                placeholder="e.g. 2.0"
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
              Specific Instructions
            </label>
            <Textarea
              rows={3}
              placeholder="Instructions and expected output..."
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
              Assign Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
