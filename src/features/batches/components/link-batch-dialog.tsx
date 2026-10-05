"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Loader2,
  Calendar,
  Check,
  X,
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
import { Badge } from "@/components/ui/badge";
import { linkProjectToBatch } from "@/features/batches/actions";
import { CreateBatchDialog } from "@/features/batches/components/create-batch-dialog";
import { format } from "date-fns";

type BatchOption = {
  id: string;
  name: string;
  status: string;
  startDate: Date | string;
  endDate: Date | string;
};

interface LinkBatchDialogProps {
  projectId: string;
  projectName: string;
  currentBatchId?: string | null;
  batches: BatchOption[];
  studios?: { id: string; name: string }[];
  defaultCompanyId?: string;
  trigger?: React.ReactNode;
}

export function LinkBatchDialog({
  projectId,
  projectName,
  currentBatchId,
  batches = [],
  studios = [],
  defaultCompanyId,
  trigger,
}: LinkBatchDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    currentBatchId ?? null
  );
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await linkProjectToBatch(projectId, selectedBatchId);
        if (res.success) {
          toast.success(
            selectedBatchId
              ? "Project batch updated successfully!"
              : "Batch unlinked from project."
          );
          setOpen(false);
          router.refresh();
        }
      } catch (err: any) {
        console.error("Link batch error:", err);
        toast.error(err.message || "Failed to update project batch.");
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
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-dashed"
          >
            <Layers className="size-3.5" />
            <span>{currentBatchId ? "Change Batch" : "Link Batch"}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border bg-card">
        {/* Header */}
        <div className="bg-[#00381F] text-[#F5EFE5] px-6 py-5 border-b border-[#00381F]/20 relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D9AE29] mb-1">
            <Sparkles className="size-3.5" />
            Project Batch Connection
          </div>
          <DialogTitle className="font-serif text-lg font-bold tracking-tight text-white">
            Link Batch to Initiative
          </DialogTitle>
          <DialogDescription className="text-xs text-[#F5EFE5]/80 mt-1">
            Associate &quot;{projectName}&quot; with a teacher training or student cohort batch.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Available Batches ({batches.length})
            </span>
            <CreateBatchDialog
              projectId={projectId}
              projectName={projectName}
              studios={studios}
              defaultCompanyId={defaultCompanyId}
              onSuccess={(newBatch) => {
                setSelectedBatchId(newBatch.id);
                setOpen(false);
                router.refresh();
              }}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-dashed border-[#00381F]/50 text-[#00381F] dark:text-[#D9AE29] hover:bg-[#00381F]/5"
                >
                  <Plus className="size-3" />
                  <span>+ Create New Batch</span>
                </Button>
              }
            />
          </div>

          {batches.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20 space-y-2">
              <Layers className="size-8 mx-auto text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground font-medium">
                No active batches found for this studio location.
              </p>
              <CreateBatchDialog
                projectId={projectId}
                projectName={projectName}
                studios={studios}
                defaultCompanyId={defaultCompanyId}
                onSuccess={(newBatch) => {
                  setSelectedBatchId(newBatch.id);
                  setOpen(false);
                  router.refresh();
                }}
                trigger={
                  <Button
                    size="sm"
                    className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-8 gap-1 mt-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Create Your First Batch</span>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {/* Option to clear batch */}
              <div
                onClick={() => setSelectedBatchId(null)}
                className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  selectedBatchId === null
                    ? "border-[#00381F] bg-[#00381F]/5 dark:border-[#D9AE29] dark:bg-[#D9AE29]/10 font-medium text-foreground"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <X className="size-3.5 text-muted-foreground" />
                  <span>No batch assigned (Independent project)</span>
                </div>
                {selectedBatchId === null && (
                  <Check className="size-4 text-[#00381F] dark:text-[#D9AE29]" />
                )}
              </div>

              {batches.map((b) => {
                const isSelected = selectedBatchId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBatchId(b.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "border-[#00381F] bg-[#00381F]/5 dark:border-[#D9AE29] dark:bg-[#D9AE29]/10 font-medium text-foreground"
                        : "border-border hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{b.name}</span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {b.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="size-3" />
                        <span>
                          {format(new Date(b.startDate), "MMM d, yyyy")} –{" "}
                          {format(new Date(b.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-4 text-[#00381F] dark:text-[#D9AE29] shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
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
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={pending}
              className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-9 min-w-[100px]"
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Connection"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
