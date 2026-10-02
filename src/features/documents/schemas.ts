import { z } from "zod";

export const DOCUMENT_TYPES = [
  "OFFER_LETTER",
  "NDA",
  "COMPLETION_CERTIFICATE",
  "EVALUATION_SHEET",
  "PROGRESS_REPORT",
  "PRESENTATION",
  "RESUME",
  "OTHER",
] as const;

export const documentSchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  type: z.enum(DOCUMENT_TYPES),
  ownerId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
});

export type DocumentValues = z.infer<typeof documentSchema>;
