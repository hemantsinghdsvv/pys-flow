import { z } from "zod";

export const reviewSchema = z.object({
  verdict: z.enum(["APPROVED", "REJECTED", "REWORK"]),
  rating: z.coerce.number().min(1).max(5).optional().nullable(),
  feedback: z.string().min(3, "Feedback is required").max(4000),
});

export type ReviewValues = z.infer<typeof reviewSchema>;
