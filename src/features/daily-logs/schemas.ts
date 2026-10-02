import { z } from "zod";

export const dailyLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  projectId: z.string().optional().or(z.literal("")),
  taskId: z.string().optional().or(z.literal("")),
  hoursWorked: z.coerce.number().min(0, "Hours cannot be negative").max(24),
  description: z.string().min(5, "Describe what you worked on").max(6000),
  achievements: z.string().max(4000).optional().or(z.literal("")),
  blockers: z.string().max(4000).optional().or(z.literal("")),
  tomorrowPlan: z.string().max(4000).optional().or(z.literal("")),
  repositoryLink: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  commitLinks: z.array(z.string().url()).max(20).optional(),
  deploymentLink: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  driveLink: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type DailyLogValues = z.infer<typeof dailyLogSchema>;
