import { z } from "zod";

export const mentorSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  designation: z.string().max(120).optional().or(z.literal("")),
  isSystemAdmin: z.boolean().default(false),
  companyId: z.string().optional(),
});

export type MentorValues = z.infer<typeof mentorSchema>;
