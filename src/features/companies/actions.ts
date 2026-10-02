"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertCompanyAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { storage } from "@/lib/storage";
import { companySchema } from "@/features/companies/schemas";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "company";
  let slug = base;
  let n = 1;
  for (;;) {
    const existing = await prisma.company.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${++n}`;
  }
}

function parsePayload(formData: FormData) {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new Error("Missing payload");
  return companySchema.parse(JSON.parse(raw));
}

async function saveImage(formData: FormData, key: string, folder: string) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) {
    throw new Error(`${key} must be an image`);
  }
  const stored = await storage.save(file, folder);
  return stored.url;
}

export async function createCompany(formData: FormData) {
  const user = await requirePermission("company:create");
  const values = parsePayload(formData);

  const logoUrl = await saveImage(formData, "logo", "companies/logos");
  const bannerUrl = await saveImage(formData, "banner", "companies/banners");

  const company = await prisma.company.create({
    data: {
      ...values,
      description: values.description || null,
      website: values.website || null,
      industry: values.industry || null,
      contactPerson: values.contactPerson || null,
      contactEmail: values.contactEmail || null,
      contactPhone: values.contactPhone || null,
      internshipDuration: values.internshipDuration || null,
      slug: await uniqueSlug(values.name),
      logoUrl,
      bannerUrl,
      createdById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    companyId: company.id,
    action: "CREATE",
    entityType: "Company",
    entityId: company.id,
    entityName: company.name,
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(id: string, formData: FormData) {
  const user = await requirePermission("company:update");
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw new Error("Company not found");
  assertCompanyAccess(user, existing.id === user.companyId ? user.companyId : existing.id);
  // Non-super-admins may only update their own company.
  if (user.isSystemAdmin !== true && user.companyId !== id) {
    throw new Error("Access denied.");
  }

  const values = parsePayload(formData);
  const logoUrl = await saveImage(formData, "logo", "companies/logos");
  const bannerUrl = await saveImage(formData, "banner", "companies/banners");

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...values,
      description: values.description || null,
      website: values.website || null,
      industry: values.industry || null,
      contactPerson: values.contactPerson || null,
      contactEmail: values.contactEmail || null,
      contactPhone: values.contactPhone || null,
      internshipDuration: values.internshipDuration || null,
      slug:
        values.name !== existing.name
          ? await uniqueSlug(values.name, id)
          : existing.slug,
      ...(logoUrl ? { logoUrl } : {}),
      ...(bannerUrl ? { bannerUrl } : {}),
    },
  });

  await logActivity({
    userId: user.id,
    companyId: company.id,
    action: "UPDATE",
    entityType: "Company",
    entityId: company.id,
    entityName: company.name,
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(id: string) {
  const user = await requirePermission("company:delete");
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new Error("Company not found");

  await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });

  await logActivity({
    userId: user.id,
    companyId: id,
    action: "DELETE",
    entityType: "Company",
    entityId: id,
    entityName: company.name,
  });

  revalidatePath("/companies");
  redirect("/companies");
}
