"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, MapPin, Calendar, Clock, Users, DollarSign, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import type { Proposal } from "@prisma/client";
import { proposalSchema, type ProposalValues } from "@/features/propose/schemas";
import { createProposal, updateProposal } from "@/features/propose/actions";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };

const DEFAULT_STUDIOS: Option[] = [
  { id: "cmuppismg001la0hoq15pebp3", name: "Pragya LKF" },
  { id: "cmupp4pd4000ma0h44lllpgc1", name: "Pragya Central" },
];

export function ProposalForm({
  proposal,
  mentors,
  studios,
}: {
  proposal?: Proposal & { company?: { id: string; name: string } | null };
  mentors: Option[];
  studios?: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  // Strictly list ONLY the 2 official Pragya Yog School studios
  const finalStudios = DEFAULT_STUDIOS.map((def) => {
    const match = studios?.find(
      (s) => s.name.trim().toLowerCase() === def.name.trim().toLowerCase()
    );
    return match || def;
  });

  const form = useForm<ProposalValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(proposalSchema) as any,
    defaultValues: {
      title: proposal?.title ?? "",
      type: proposal?.type ?? "WORKSHOP",
      scheduleType: proposal?.scheduleType ?? "ONE_DAY",
      locationType: proposal?.locationType ?? "STUDIO",
      locationName: proposal?.locationName ?? "",
      startDate: proposal?.startDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      endDate: proposal?.endDate?.toISOString().slice(0, 10) ?? "",
      dailyHours: proposal?.dailyHours ?? null,
      totalHours: proposal?.totalHours ?? null,
      capacity: proposal?.capacity ?? null,
      teacherName: proposal?.teacherName ?? "",
      teacherId: proposal?.teacherId ?? "",
      pricing: proposal?.pricing ?? null,
      budget: proposal?.budget ?? null,
      description: proposal?.description ?? "",
      objectives: proposal?.objectives ?? "",
      targetAudience: proposal?.targetAudience ?? "",
      documentUrl: proposal?.documentUrl ?? "",
      companyId: proposal?.companyId ?? "",
      companyName: proposal?.company?.name ?? "",
      submitForReview: false,
    },
  });

  const { watch, register, setValue, formState: { errors } } = form;
  const currentType = watch("type");
  const scheduleType = watch("scheduleType");
  const locationType = watch("locationType");

  function onSubmit(values: ProposalValues) {
    const formData = new FormData();
    formData.set("payload", JSON.stringify({ ...values, submitForReview: true }));
    if (mediaFile) formData.set("media", mediaFile);

    startTransition(async () => {
      try {
        let resId = proposal?.id;
        if (proposal) {
          const res = await updateProposal(proposal.id, formData);
          resId = res.id;
        } else {
          const res = await createProposal(formData);
          resId = res.id;
        }
        toast.success("Event registration submitted successfully!");
        router.push(`/propose/${resId}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit form");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-[#00381F]/15 dark:border-border/60 bg-card shadow-sm overflow-hidden">
        {/* Themed Header */}
        <div className="border-b border-[#00381F]/10 dark:border-border/40 px-6 sm:px-8 py-6 bg-gradient-to-r from-[#00381F]/[0.03] via-transparent to-[#D9AE29]/[0.05]">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00381F] dark:text-[#D9AE29] mb-1.5">
            <Sparkles className="size-3.5" /> Pragya Yog School
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground font-normal tracking-tight">
            Event Registration
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Fill in the workshop, training, or retreat details, studio location, schedule, and pricing.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Type:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "WORKSHOP", label: "Workshop" },
                { value: "TRAINING", label: "Training" },
                { value: "RETREAT", label: "Retreat" },
              ].map((item) => {
                const isSelected = currentType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setValue("type", item.value as "WORKSHOP" | "TRAINING" | "RETREAT")}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#00381F] bg-[#00381F] text-[#F5EFE5] dark:border-[#D9AE29] dark:bg-[#D9AE29] dark:text-[#1E1E1E] shadow-xs"
                        : "border-input bg-background/60 text-foreground hover:border-[#00381F]/30 hover:bg-[#00381F]/[0.02]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {errors.type && <p className="text-xs text-destructive mt-1.5">{errors.type.message}</p>}
          </div>

          {/* Schedule Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Schedule:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "ONE_DAY", label: "One Day" },
                { value: "MULTI_DAYS", label: "Multi Days" },
              ].map((item) => {
                const isSelected = scheduleType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setValue("scheduleType", item.value as "ONE_DAY" | "MULTI_DAYS")}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#00381F] bg-[#00381F] text-[#F5EFE5] dark:border-[#D9AE29] dark:bg-[#D9AE29] dark:text-[#1E1E1E] shadow-xs"
                        : "border-input bg-background/60 text-foreground hover:border-[#00381F]/30 hover:bg-[#00381F]/[0.02]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {errors.scheduleType && <p className="text-xs text-destructive mt-1.5">{errors.scheduleType.message}</p>}

            {scheduleType === "MULTI_DAYS" && (
              <div className="mt-3.5 p-4 rounded-xl bg-[#00381F]/[0.03] dark:bg-[#00381F]/10 border border-[#00381F]/15 space-y-2">
                <label className="block text-xs font-medium text-foreground">
                  Duration (Total Hours):
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g., 16 or 50"
                  {...register("totalHours", { valueAsNumber: true })}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
                />
                {errors.totalHours && <p className="text-xs text-destructive mt-1">{errors.totalHours.message}</p>}
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Location:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "STUDIO", label: "Studio" },
                { value: "OUTDOOR", label: "Outdoor" },
                { value: "OVERSEAS", label: "Overseas" },
              ].map((item) => {
                const isSelected = locationType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setValue("locationType", item.value as "STUDIO" | "OUTDOOR" | "OVERSEAS")}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#00381F] bg-[#00381F] text-[#F5EFE5] dark:border-[#D9AE29] dark:bg-[#D9AE29] dark:text-[#1E1E1E] shadow-xs"
                        : "border-input bg-background/60 text-foreground hover:border-[#00381F]/30 hover:bg-[#00381F]/[0.02]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {errors.locationType && <p className="text-xs text-destructive mt-1.5">{errors.locationType.message}</p>}

            {locationType === "STUDIO" && (
              <div className="mt-3.5 p-4 rounded-xl bg-[#00381F]/[0.03] dark:bg-[#00381F]/10 border border-[#00381F]/15 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <MapPin className="size-3.5 text-[#00381F] dark:text-[#D9AE29]" />
                  <span>Studio Location:</span>
                </div>
                <select
                  value={watch("locationName") || ""}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setValue("locationName", selectedVal);
                    const matchedStudio = finalStudios.find((s) => s.name === selectedVal);
                    if (matchedStudio) {
                      setValue("companyId", matchedStudio.id);
                      setValue("companyName", matchedStudio.name);
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
                >
                  <option value="">-- Select Studio --</option>
                  {finalStudios.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.locationName && <p className="text-xs text-destructive mt-1">{errors.locationName.message}</p>}
              </div>
            )}
          </div>

          {/* Teacher Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Teacher:
            </label>
            <select
              {...register("teacherId")}
              onChange={(e) => {
                const id = e.target.value;
                setValue("teacherId", id);
                const name = e.target.options[e.target.selectedIndex].text;
                setValue("teacherName", id ? name : "");
              }}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
            >
              <option value="">-- Select Teacher --</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.teacherId && <p className="text-xs text-destructive mt-1">{errors.teacherId.message}</p>}
          </div>

          {/* Name / Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Name:
            </label>
            <input
              type="text"
              placeholder="Enter event or participant name"
              {...register("title")}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* Dates & Hours */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Date:
              </label>
              <input
                type="date"
                {...register("startDate")}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              />
              {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Hours:
              </label>
              <input
                type="text"
                placeholder="e.g., 09:00 AM - 05:00 PM"
                {...register("objectives")}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              />
              {errors.objectives && <p className="text-xs text-destructive mt-1">{errors.objectives.message}</p>}
            </div>
          </div>

          {/* Capacity & Pricing */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Capacity:
              </label>
              <input
                type="number"
                min="1"
                placeholder="Maximum capacity"
                {...register("capacity", { valueAsNumber: true })}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              />
              {errors.capacity && <p className="text-xs text-destructive mt-1">{errors.capacity.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Pricing ($):
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("pricing", { valueAsNumber: true })}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29]"
              />
              {errors.pricing && <p className="text-xs text-destructive mt-1">{errors.pricing.message}</p>}
            </div>
          </div>

          {/* Info / Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Info:
            </label>
            <textarea
              rows={4}
              placeholder="Additional details or description..."
              {...register("description")}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:border-[#00381F] focus:outline-none focus:ring-1 focus:ring-[#00381F] dark:focus:border-[#D9AE29] dark:focus:ring-[#D9AE29] resize-y"
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Media Upload:
            </label>
            <div className="relative flex items-center">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#00381F]/10 file:text-[#00381F] dark:file:bg-[#D9AE29]/20 dark:file:text-[#D9AE29] hover:file:cursor-pointer focus:outline-none focus:border-[#00381F]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] font-medium py-3 rounded-lg shadow-sm transition-all h-12 text-sm flex items-center justify-center gap-2 cursor-pointer mt-8"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Submitting Event...</span>
              </>
            ) : (
              <span>Submit Form</span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
