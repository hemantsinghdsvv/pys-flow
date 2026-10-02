import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  phone: z.string().max(30).optional().or(z.literal("")),
  designation: z.string().max(120).optional().or(z.literal("")),
  // Student-only fields (ignored for non-students).
  githubUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  skills: z.array(z.string()).default([]),
});
export type ProfileValues = z.infer<typeof profileSchema>;
