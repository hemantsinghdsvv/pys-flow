"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Batch } from "@prisma/client";
import { batchSchema, type BatchValues } from "@/features/batches/schemas";
import { createBatch, updateBatch } from "@/features/batches/actions";
import { BATCH_STATUS_LABELS } from "@/config/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

type CompanyOption = { id: string; name: string };

export function BatchForm({
  batch,
  companies,
}: {
  batch?: Batch;
  /** Provided only for super admins without an active company scope. */
  companies?: CompanyOption[];
}) {
  const [pending, startTransition] = useTransition();

  const form = useForm<BatchValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      name: batch?.name ?? "",
      description: batch?.description ?? "",
      startDate: batch ? batch.startDate.toISOString().slice(0, 10) : "",
      endDate: batch ? batch.endDate.toISOString().slice(0, 10) : "",
      status: batch?.status ?? "UPCOMING",
      companyId: batch?.companyId ?? undefined,
    },
  });

  function onSubmit(values: BatchValues) {
    startTransition(async () => {
      try {
        if (batch) await updateBatch(batch.id, values);
        else await createBatch(values);
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {companies && !batch && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Company *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Batch name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Summer Internship 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Focus areas, expectations, tracks..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date *</FormLabel>
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
                      {Object.entries(BATCH_STATUS_LABELS).map(([k, v]) => (
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
            <div className="flex items-end justify-end md:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                {batch ? "Save changes" : "Create batch"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
