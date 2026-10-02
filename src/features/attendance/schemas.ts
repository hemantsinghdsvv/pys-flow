import { z } from "zod";

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
] as const;

export const markAttendanceSchema = z.object({
  userId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
});

export type MarkAttendanceValues = z.infer<typeof markAttendanceSchema>;
