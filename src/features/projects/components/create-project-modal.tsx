"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FolderGit2,
  Plus,
  Loader2,
  Calendar,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSimpleProject } from "@/features/projects/actions";

interface CreateProjectModalProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onSuccess?: () => void;
}

export function CreateProjectModal({
  trigger,
  defaultOpen = false,
  onSuccess,
}: CreateProjectModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "ACTIVE" as "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter a project or initiative title.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSimpleProject({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          status: formData.status,
          priority: formData.priority,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        });

        if (res.success) {
          toast.success("Project created successfully!", {
            description: `"${formData.name}" is now active in school operations.`,
          });
          setOpen(false);
          setFormData({
            name: "",
            description: "",
            status: "ACTIVE",
            priority: "MEDIUM",
            startDate: new Date().toISOString().slice(0, 10),
            endDate: "",
          });
          router.refresh();
          if (onSuccess) onSuccess();
        }
      } catch (err: any) {
        console.error("Create project error:", err);
        setError(err.message || "Failed to create project. Please try again.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5 shadow-xs font-medium">
            <Plus className="size-4" />
            <span>Add Project</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-border bg-card">
        {/* Header Ribbon */}
        <div className="bg-[#00381F] text-[#F5EFE5] px-6 py-5 border-b border-[#00381F]/20 relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
            <FolderGit2 className="size-36 text-white" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D9AE29] mb-1">
            <Sparkles className="size-3.5" />
            Pragya Yog Operations
          </div>
          <DialogTitle className="font-serif text-xl font-bold tracking-tight text-white">
            Create Operational Initiative
          </DialogTitle>
          <DialogDescription className="text-xs text-[#F5EFE5]/80 mt-1 max-w-sm">
            Launch a school program, teacher training batch, workshop series, or studio renovation project.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Title */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="text-xs font-medium text-foreground">
              Project / Initiative Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="e.g. 200-Hour Hatha & Vinyasa TTC 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 text-sm focus-visible:ring-[#00381F]"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="project-desc" className="text-xs font-medium text-foreground">
              Description & Objectives
            </Label>
            <Textarea
              id="project-desc"
              rows={3}
              placeholder="Outline the scope, milestones, or target outcomes for this initiative..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-sm resize-none focus-visible:ring-[#00381F]"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-9.5 text-xs w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">Planning / In Preparation</SelectItem>
                  <SelectItem value="ACTIVE">Active / Ongoing</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val: any) => setFormData({ ...formData, priority: val })}
              >
                <SelectTrigger className="h-9.5 text-xs w-full">
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent / Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="project-start" className="text-xs font-medium text-foreground flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                Start Date
              </Label>
              <Input
                id="project-start"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-9.5 text-xs focus-visible:ring-[#00381F]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-end" className="text-xs font-medium text-foreground flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                Target Completion Date
              </Label>
              <Input
                id="project-end"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="h-9.5 text-xs focus-visible:ring-[#00381F]"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-9 min-w-[120px]"
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-3.5 mr-1.5" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
