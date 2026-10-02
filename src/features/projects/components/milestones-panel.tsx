"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Flag, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Milestone } from "@prisma/client";
import {
  milestoneSchema,
  type MilestoneValues,
} from "@/features/projects/schemas";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/features/projects/actions";
import { MILESTONE_STATUS_LABELS } from "@/config/labels";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function MilestoneDialog({
  projectId,
  milestone,
  trigger,
}: {
  projectId: string;
  milestone?: Milestone;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<MilestoneValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: milestone?.title ?? "",
      description: milestone?.description ?? "",
      dueDate: milestone?.dueDate?.toISOString().slice(0, 10) ?? "",
      status: milestone?.status ?? "PENDING",
    },
  });

  function onSubmit(values: MilestoneValues) {
    startTransition(async () => {
      try {
        if (milestone) await updateMilestone(milestone.id, values);
        else await createMilestone(projectId, values);
        toast.success(milestone ? "Milestone updated" : "Milestone added");
        setOpen(false);
        if (!milestone) form.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {milestone ? "Edit milestone" : "Add milestone"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="MVP release" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(MILESTONE_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                {milestone ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function MilestonesPanel({
  projectId,
  milestones,
  canManage,
}: {
  projectId: string;
  milestones: Milestone[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <MilestoneDialog
            projectId={projectId}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="size-4" /> Add milestone
              </Button>
            }
          />
        </div>
      )}
      {milestones.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No milestones"
          description="Break the project into checkpoints with due dates."
        />
      ) : (
        <ol className="relative space-y-4 border-l pl-6">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="relative">
              <span className="absolute -left-[1.85rem] top-1 flex size-4 items-center justify-center rounded-full border bg-background">
                <span
                  className={
                    milestone.status === "COMPLETED"
                      ? "size-2 rounded-full bg-emerald-500"
                      : milestone.status === "DELAYED"
                        ? "size-2 rounded-full bg-orange-500"
                        : milestone.status === "IN_PROGRESS"
                          ? "size-2 rounded-full bg-blue-500"
                          : "size-2 rounded-full bg-muted-foreground/40"
                  }
                />
              </span>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium leading-tight">{milestone.title}</p>
                  {milestone.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge
                      status={milestone.status}
                      label={MILESTONE_STATUS_LABELS[milestone.status]}
                    />
                    {milestone.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {format(milestone.dueDate, "d MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <MilestoneDialog
                      projectId={projectId}
                      milestone={milestone}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label="Edit milestone"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      disabled={pending}
                      aria-label="Delete milestone"
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await deleteMilestone(milestone.id);
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Failed"
                            );
                          }
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
