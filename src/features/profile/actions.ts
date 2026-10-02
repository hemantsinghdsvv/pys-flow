"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { profileSchema, type ProfileValues } from "@/features/profile/schemas";

/** Update the signed-in user's own profile. */
export async function updateProfile(values: ProfileValues) {
  const user = await requireUser();
  const data = profileSchema.parse(values);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      phone: data.phone || null,
      designation: data.designation || null,
    },
  });

  if (user.role === "INTERN") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (profile) {
      await prisma.studentProfile.update({
        where: { userId: user.id },
        data: {
          githubUrl: data.githubUrl || null,
          linkedinUrl: data.linkedinUrl || null,
          portfolioUrl: data.portfolioUrl || null,
          skills: data.skills.map((s) => s.trim()).filter(Boolean),
        },
      });
    }
  }

  await logActivity({
    userId: user.id,
    companyId: user.companyId,
    action: "UPDATE",
    entityType: "Profile",
    entityId: user.id,
  });

  revalidatePath("/profile");
}
