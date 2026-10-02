import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2, "Project name is required").max(160),
  description: z.string().max(4000).optional().or(z.literal("")),
  objective: z.string().max(2000).optional().or(z.literal("")),
  techStack: z.array(z.string().min(1).max(40)).max(30),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  deliverables: z.string().max(4000).optional().or(z.literal("")),
  repositoryUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  deploymentUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  batchId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional(),
});

export type ProjectValues = z.infer<typeof projectSchema>;

export const milestoneSchema = z.object({
  title: z.string().min(2, "Title is required").max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"]),
});

export type MilestoneValues = z.infer<typeof milestoneSchema>;

export const teamSchema = z.object({
  name: z.string().min(2, "Team name is required").max(120),
  description: z.string().max(1000).optional().or(z.literal("")),
});

export type TeamValues = z.infer<typeof teamSchema>;
