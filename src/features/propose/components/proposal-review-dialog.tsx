"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  proposalReviewSchema,
  type ProposalReviewValues,
} from "@/features/propose/schemas";
import { reviewProposal } from "@/features/propose/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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

export function ProposalReviewDialog({
  proposalId,
  proposalTitle,
  trigger,
}: {
  proposalId: string;
  proposalTitle: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<ProposalReviewValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(proposalReviewSchema) as any,
    defaultValues: { verdict: "APPROVED", rating: 5, feedback: "" },
  });

  const rating = form.watch("rating") ?? 0;

  function onSubmit(values: ProposalReviewValues) {
    startTransition(async () => {
      try {
        await reviewProposal(proposalId, values);
        toast.success("Proposal review submitted successfully");
        setOpen(false);
        form.reset();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <CheckCircle2 className="size-4" /> Review Proposal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review “{proposalTitle}”</DialogTitle>
          <DialogDescription>
            Approve, request rework, or reject this event proposal. Provide feedback and copyright verification notes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="verdict"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verdict *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approve for Production</SelectItem>
                      <SelectItem value="REWORK">Request Rework / Changes</SelectItem>
                      <SelectItem value="REJECTED">Reject Proposal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={() => (
                <FormItem>
                  <FormLabel>Evaluation Rating</FormLabel>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="rounded p-1 text-muted-foreground transition hover:text-amber-500"
                        onClick={() => form.setValue("rating", star)}
                      >
                        <Star
                          className={cn(
                            "size-5",
                            rating >= star
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/40"
                          )}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {rating} / 5
                      </span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback & Approval Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Detail your evaluation, copyright checks, budget approvals, or required changes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Submit review
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
