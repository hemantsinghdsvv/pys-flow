import { z } from "zod";

export const holidaySchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  date: z.string().min(1, "Date is required"),
});

export const departmentSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  code: z.string().max(20).optional().or(z.literal("")),
});

export const technologySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category: z.string().max(60).optional().or(z.literal("")),
});

export const reminderSettingSchema = z.object({
  key: z.string().min(1),
  hour: z.coerce.number().int().min(0).max(23),
  minute: z.coerce.number().int().min(0).max(59),
  enabled: z.boolean(),
});

export type HolidayValues = z.infer<typeof holidaySchema>;
export type DepartmentValues = z.infer<typeof departmentSchema>;
export type TechnologyValues = z.infer<typeof technologySchema>;
export type ReminderSettingValues = z.infer<typeof reminderSettingSchema>;
