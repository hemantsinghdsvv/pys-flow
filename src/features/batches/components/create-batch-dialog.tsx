"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Loader2,
  Calendar,
  AlertCircle,
  MapPin,
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
import { Checkbox } from "@/components/ui/checkbox";
import { createSimpleBatch } from "@/features/batches/actions";

interface CreateBatchDialogProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  studios?: { id: string; name: string }[];
  defaultCompanyId?: string;
  projectId?: string;
  projectName?: string;
  onSuccess?: (batch: any) => void;
}

export function CreateBatchDialog({
  trigger,
  defaultOpen = false,
  studios = [],
  defaultCompanyId,
  projectId,
  projectName,
  onSuccess,
}: CreateBatchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default dates: start today, end 3 months from now
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    companyId: defaultCompanyId || (studios[0]?.id ?? ""),
    status: "ACTIVE" as "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
    startDate: today,
    endDate: defaultEnd,
    linkToProject: !!projectId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter a batch name.");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError("End date must be after the start date.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSimpleBatch({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          companyId: formData.companyId || undefined,
          status: formData.status,
          startDate: formData.startDate,
          endDate: formData.endDate,
          projectId: formData.linkToProject && projectId ? projectId : undefined,
        });

        if (res.success) {
          toast.success("Batch created successfully!", {
            description: projectName && formData.linkToProject
              ? `"${formData.name}" was created and linked to ${projectName}.`
              : `"${formData.name}" is now available in your studio batches.`,
          });
          setOpen(false);
          setFormData({
            name: "",
            description: "",
            companyId: defaultCompanyId || (studios[0]?.id ?? ""),
            status: "ACTIVE",
            startDate: today,
            endDate: defaultEnd,
            linkToProject: !!projectId,
          });
          router.refresh();
          if (onSuccess) onSuccess(res.batch);
        }
      } catch (err: any) {
        console.error("Create batch error:", err);
        setError(err.message || "Failed to create batch. Please check inputs.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            size="sm"
            className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] gap-1.5 shadow-xs font-medium"
          >
            <Plus className="size-4" />
            <span>Create Batch</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-border bg-card">
        {/* Header Ribbon */}
        <div className="bg-[#00381F] text-[#F5EFE5] px-6 py-5 border-b border-[#00381F]/20 relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
            <Layers className="size-36 text-white" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D9AE29] mb-1">
            <Sparkles className="size-3.5" />
            Pragya Cohort Management
          </div>
          <DialogTitle className="font-serif text-xl font-bold tracking-tight text-white">
            Create New Batch
          </DialogTitle>
          <DialogDescription className="text-xs text-[#F5EFE5]/80 mt-1 max-w-sm">
            Set up a teacher training cohort, student internship batch, or seasonal program group.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Batch Name */}
          <div className="space-y-1.5">
            <Label htmlFor="batch-name" className="text-xs font-medium text-foreground">
              Batch Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="batch-name"
              placeholder="e.g., Morning TTC Batch - 2026 or Spring Intensive"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 text-sm focus-visible:ring-[#00381F]"
              required
            />
          </div>

          {/* Studio Location & Status */}
          <div className="grid grid-cols-2 gap-3.5">
            {studios.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" />
                  Studio Location
                </Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(val) => setFormData({ ...formData, companyId: val })}
                >
                  <SelectTrigger className="h-9.5 text-xs w-full">
                    <SelectValue placeholder="Select studio" />
                  </SelectTrigger>
                  <SelectContent>
                    {studios.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={`space-y-1.5 ${studios.length === 0 ? "col-span-2" : ""}`}>
              <Label className="text-xs font-medium text-foreground">Batch Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-9.5 text-xs w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active (Currently Running)</SelectItem>
                  <SelectItem value="UPCOMING">Upcoming (Scheduled)</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="batch-desc" className="text-xs font-medium text-foreground">
              Description / Notes (Optional)
            </Label>
            <Textarea
              id="batch-desc"
              rows={2}
              placeholder="e.g., Focus on 200-Hour Hatha & Ashtanga curriculum with weekly practical assessments..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-xs resize-none focus-visible:ring-[#00381F]"
            />
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="batch-start" className="text-xs font-medium text-foreground flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="batch-start"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-9.5 text-xs focus-visible:ring-[#00381F]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batch-end" className="text-xs font-medium text-foreground flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="batch-end"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="h-9.5 text-xs focus-visible:ring-[#00381F]"
                required
              />
            </div>
          </div>

          {/* Project Link Checkbox */}
          {projectId && (
            <div className="flex items-center space-x-2 pt-2 pb-1 bg-muted/40 p-3 rounded-lg border border-border/60">
              <Checkbox
                id="link-project"
                checked={formData.linkToProject}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, linkToProject: Boolean(checked) })
                }
              />
              <label
                htmlFor="link-project"
                className="text-xs font-medium leading-none cursor-pointer select-none text-foreground"
              >
                Automatically link this new batch to {projectName ? `"${projectName}"` : "this project"}
              </label>
            </div>
          )}

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
                  Create Batch
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
