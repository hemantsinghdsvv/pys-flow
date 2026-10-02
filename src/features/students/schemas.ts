import { z } from "zod";

export const studentSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  rollNumber: z.string().max(40).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal("")),
  batchId: z.string().optional().or(z.literal("")),
  skills: z.array(z.string().min(1).max(40)).max(30),
  githubUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  companyId: z.string().optional(),
});

export type StudentValues = z.infer<typeof studentSchema>;
