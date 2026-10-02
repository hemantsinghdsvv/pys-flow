import { z } from "zod";

export const batchSchema = z
  .object({
    name: z.string().min(2, "Batch name is required").max(120),
    description: z.string().max(2000).optional().or(z.literal("")),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
    companyId: z.string().optional(),
  })
  .refine((v) => new Date(v.endDate) > new Date(v.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export type BatchValues = z.infer<typeof batchSchema>;
