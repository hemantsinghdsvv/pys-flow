"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, resolveCompanyForWrite } from "@/lib/access";
import { provisionUser, generatePassword } from "@/features/users/create-user";

// ─── CSV row schema ────────────────────────────────────────────

const rowSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().email("Invalid email"),
  password: z.string().optional(),
  phone: z.string().max(20).optional(),
  designation: z.string().max(120).optional(),
  isSystemAdmin: z.boolean().default(false),
});

// ─── Simple CSV parser ─────────────────────────────────────────

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < 2) return [];
  const headers = splitCSVLine(nonEmpty[0]).map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").trim();
    });
    return row;
  });
}

// ─── Types ─────────────────────────────────────────────────────

export type BulkUploadMentorResult = {
  created: { name: string; email: string; isSystemAdmin: boolean; password: string }[];
  errors: { row: number; email: string; message: string }[];
};

// ─── Server action ─────────────────────────────────────────────

export async function bulkUploadMentors(
  formData: FormData
): Promise<BulkUploadMentorResult> {
  const actor = await requirePermission("user:create");
  if (!actor.isSystemAdmin) {
    throw new Error("Only System Admin can bulk upload staff.");
  }

  const selectedCompanyId = formData.get("companyId") as string | null;
  const companyId = await resolveCompanyForWrite(actor, selectedCompanyId);

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No CSV file provided.");
  }
  if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
    throw new Error("File must be a .csv file.");
  }

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) throw new Error("CSV file is empty or has no data rows.");

  const result: BulkUploadMentorResult = { created: [], errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    const parsed = rowSchema.safeParse({
      name: raw.name,
      email: raw.email,
      password: raw.password || undefined,
      phone: raw.phone || undefined,
      designation: raw.designation || undefined,
      isSystemAdmin: (raw.role?.toUpperCase() === "MANAGER" || raw.isSystemAdmin === "true") || false,
    });

    if (!parsed.success) {
      result.errors.push({
        row: rowNum,
        email: raw.email ?? "(unknown)",
        message: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    const password =
      data.password && data.password.length >= 8
        ? data.password
        : generatePassword();

    try {
      const user = await provisionUser({
        name: data.name,
        email: data.email,
        password,
        isSystemAdmin: data.isSystemAdmin,
        companyId,
        phone: data.phone,
        designation: data.designation,
      });

      result.created.push({
        name: user.name,
        email: user.email,
        isSystemAdmin: data.isSystemAdmin,
        password,
      });
    } catch (err) {
      result.errors.push({
        row: rowNum,
        email: data.email,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (result.created.length > 0) {
    revalidatePath("/mentors");
  }

  return result;
}
