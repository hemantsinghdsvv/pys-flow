"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Proposal } from "@prisma/client";
import { proposalSchema, type ProposalValues } from "@/features/propose/schemas";
import { createProposal, updateProposal } from "@/features/propose/actions";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };

export function ProposalForm({
  proposal,
  mentors,
}: {
  proposal?: Proposal & { company?: { id: string; name: string } | null };
  mentors: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mediaFile, setMediaFile] = useState<File | null>(null);

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
        toast.success("✅ Form submitted successfully!");
        router.push(`/propose/${resId}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "❌ Something went wrong");
      }
    });
  }

  return (
    <div className="flex justify-center w-full bg-[#f4f6f9] min-h-screen py-10">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm w-full max-w-2xl border">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Event Registration</h2>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Type */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Type:</label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="WORKSHOP" {...register("type")} className="accent-blue-600 size-4" /> Workshop
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="TRAINING" {...register("type")} className="accent-blue-600 size-4" /> Training
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="RETREAT" {...register("type")} className="accent-blue-600 size-4" /> Retreat
              </label>
            </div>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
          </div>

          {/* Schedule */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Schedule:</label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="ONE_DAY" {...register("scheduleType")} className="accent-blue-600 size-4" /> One Day
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="MULTI_DAYS" {...register("scheduleType")} className="accent-blue-600 size-4" /> Multi Days
              </label>
            </div>
            {errors.scheduleType && <p className="text-red-500 text-sm mt-1">{errors.scheduleType.message}</p>}
            
            {scheduleType === "MULTI_DAYS" && (
              <div className="mt-3 ml-5 pl-4 border-l-2 border-gray-200">
                <label className="block font-bold text-gray-700 mb-2 text-sm">Duration (Hours / Total Hours):</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g., 4 or 16"
                  {...register("totalHours", { valueAsNumber: true })}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                />
                {errors.totalHours && <p className="text-red-500 text-sm mt-1">{errors.totalHours.message}</p>}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Location:</label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="STUDIO" {...register("locationType")} className="accent-blue-600 size-4" /> Studio
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="OUTDOOR" {...register("locationType")} className="accent-blue-600 size-4" /> Outdoor
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-normal">
                <input type="radio" value="OVERSEAS" {...register("locationType")} className="accent-blue-600 size-4" /> Overseas
              </label>
            </div>
            {errors.locationType && <p className="text-red-500 text-sm mt-1">{errors.locationType.message}</p>}

            {locationType === "STUDIO" && (
              <div className="mt-3 ml-5 pl-4 border-l-2 border-blue-500">
                <label className="block font-bold text-gray-700 mb-2 text-sm">Studio Location:</label>
                <select
                  {...register("locationName")}
                  className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="">-- Select Studio --</option>
                  <option value="pragya_yog_school_main">Pragya Yog School - Main Studio</option>
                  <option value="pragya_central_sadhna">Pragya Central - Sadhna Room</option>
                  <option value="pragya_central_tapasya">Pragya Central - Tapasya</option>
                </select>
                {errors.locationName && <p className="text-red-500 text-sm mt-1">{errors.locationName.message}</p>}
              </div>
            )}
          </div>

          {/* Teacher Dropdown */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Teacher:</label>
            <select
              {...register("teacherId")}
              onChange={(e) => {
                const id = e.target.value;
                setValue("teacherId", id);
                const name = e.target.options[e.target.selectedIndex].text;
                setValue("teacherName", id ? name : "");
              }}
              className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="">-- Select Teacher --</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {errors.teacherId && <p className="text-red-500 text-sm mt-1">{errors.teacherId.message}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Name:</label>
            <input
              type="text"
              placeholder="Enter event or participant name"
              {...register("title")}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Date:</label>
            <input
              type="date"
              {...register("startDate")}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />
            {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>}
          </div>

          {/* Hours */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Hours:</label>
            <input
              type="text"
              placeholder="e.g., 09:00 AM - 05:00 PM"
              {...register("objectives")}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />
            {errors.objectives && <p className="text-red-500 text-sm mt-1">{errors.objectives.message}</p>}
          </div>

          {/* Capacity */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Capacity:</label>
            <input
              type="number"
              min="1"
              placeholder="Maximum capacity"
              {...register("capacity", { valueAsNumber: true })}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />
            {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>}
          </div>

          {/* Info */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Info:</label>
            <textarea
              rows={4}
              placeholder="Additional details or description..."
              {...register("description")}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm resize-y"
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>

          {/* Media Upload */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Media Upload:</label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          {/* Pricing */}
          <div>
            <label className="block font-bold text-gray-700 mb-2">Pricing ($):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("pricing", { valueAsNumber: true })}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
            />
            {errors.pricing && <p className="text-red-500 text-sm mt-1">{errors.pricing.message}</p>}
          </div>

          <Button 
            type="submit" 
            disabled={pending}
            className="w-full bg-[#007bff] hover:bg-[#0056b3] text-white font-medium py-3 rounded-md transition-colors h-12"
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Submit Form
          </Button>
        </form>
      </div>
    </div>
  );
}
