import { z } from "zod";

export const TASK_STATUSES = [
  "PENDING",
  "REVIEW",
  "COMPLETED",
  "CANCELLED",
] as const;

export const taskSchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  description: z.string().max(65000).optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  milestoneId: z.string().optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  estimatedHours: z.coerce.number().min(0).max(1000).optional().nullable(),
  startDate: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  reportingToId: z.string().optional().or(z.literal("")),

  dependencyIds: z.array(z.string()).max(20).optional(),
});

export type TaskValues = z.infer<typeof taskSchema>;

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(4000),
});

export type CommentValues = z.infer<typeof commentSchema>;
