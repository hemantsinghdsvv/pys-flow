import { z } from "zod";

export const proposalSchema = z.object({
  title: z.string().min(2, "Title is required").max(160),
  type: z.enum(["WORKSHOP", "TRAINING", "RETREAT", "PROJECT", "OTHER"]),
  scheduleType: z.enum(["ONE_DAY", "MULTI_DAYS"]),
  locationType: z.enum(["STUDIO", "OUTDOOR", "OVERSEAS", "REMOTE", "HYBRID"]),
  locationName: z.string().max(200).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  dailyHours: z.coerce.number().min(0).max(24).optional().nullable(),
  totalHours: z.coerce.number().min(0).max(1000).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  teacherName: z.string().max(120).optional().or(z.literal("")),
  teacherId: z.string().optional().or(z.literal("")),
  pricing: z.coerce.number().min(0).optional().nullable(),
  budget: z.coerce.number().min(0).optional().nullable(),
  description: z.string().min(5, "Description is required").max(4000),
  objectives: z.string().max(2000).optional().or(z.literal("")),
  targetAudience: z.string().max(500).optional().or(z.literal("")),
  documentUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  companyId: z.string().optional(),
  companyName: z.string().optional().or(z.literal("")),
  submitForReview: z.boolean().optional(),
});

export type ProposalValues = z.infer<typeof proposalSchema>;

export const proposalReviewSchema = z.object({
  verdict: z.enum(["APPROVED", "REWORK", "REJECTED"]),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  feedback: z.string().min(2, "Feedback is required").max(2000),
});

export type ProposalReviewValues = z.infer<typeof proposalReviewSchema>;

export const proposalConvertSchema = z.object({
  autoCreateKanbanTasks: z.boolean().default(true),
  batchId: z.string().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).default("INTERMEDIATE"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export type ProposalConvertValues = z.infer<typeof proposalConvertSchema>;
