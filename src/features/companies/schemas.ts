import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "Company name is required").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  website: z
    .string()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  contactPerson: z.string().max(120).optional().or(z.literal("")),
  contactEmail: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().max(20).optional().or(z.literal("")),
  internshipDuration: z.string().max(60).optional().or(z.literal("")),
  internshipType: z.enum(["ONSITE", "REMOTE", "HYBRID"]),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #6366f1"),
  techStack: z.array(z.string().min(1).max(40)).max(30),
});

export type CompanyValues = z.infer<typeof companySchema>;
