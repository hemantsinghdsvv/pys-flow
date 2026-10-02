"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, resolveCompanyForWrite } from "@/lib/access";
import { provisionUser, generatePassword } from "@/features/users/create-user";

// ─── CSV row schema ────────────────────────────────────────────

const rowSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().email("Invalid email"),
  password: z.string().optional(),
  phone: z.string().max(20).optional(),
  rollNumber: z.string().max(40).optional(),
  department: z.string().max(120).optional(),
  batchId: z.string().optional(),
  skills: z.string().optional(), // comma-separated within the field
});

// ─── Simple CSV parser ─────────────────────────────────────────

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

/** Handles quoted fields containing commas. */
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

// ─── Types ─────────────────────────────────────────────────────

export type BulkUploadResult = {
  created: { name: string; email: string; password: string }[];
  errors: { row: number; email: string; message: string }[];
};

// ─── Server action ─────────────────────────────────────────────

export async function bulkUploadStudents(
  formData: FormData
): Promise<BulkUploadResult> {
  const actor = await requirePermission("user:create");
  if (actor.role !== "MANAGER") {
    throw new Error("Only Super Admin can bulk upload students.");
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

  if (rows.length === 0) {
    throw new Error("CSV file is empty or has no data rows.");
  }

  const result: BulkUploadResult = { created: [], errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header

    // Validate
    const parsed = rowSchema.safeParse({
      name: rawRow.name,
      email: rawRow.email,
      password: rawRow.password || undefined,
      phone: rawRow.phone || undefined,
      rollNumber: rawRow.rollnumber || rawRow["roll number"] || rawRow.roll_number || undefined,
      department: rawRow.department || undefined,
      batchId: rawRow.batchid || rawRow["batch id"] || rawRow.batch_id || undefined,
      skills: rawRow.skills || undefined,
    });

    if (!parsed.success) {
      result.errors.push({
        row: rowNum,
        email: rawRow.email ?? "(unknown)",
        message: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    const password = data.password && data.password.length >= 8
      ? data.password
      : generatePassword();

    // Parse skills from comma-separated string
    const skills = data.skills
      ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      const user = await provisionUser({
        name: data.name,
        email: data.email,
        password,
        isSystemAdmin: false,
        companyId,
        phone: data.phone,
      });

      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          companyId,
          batchId: data.batchId || null,
          rollNumber: data.rollNumber || null,
          department: data.department || null,
          skills,
        },
      });

      result.created.push({ name: data.name, email: data.email, password });
    } catch (err) {
      result.errors.push({
        row: rowNum,
        email: data.email,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (result.created.length > 0) {
    revalidatePath("/students");
  }

  return result;
}
