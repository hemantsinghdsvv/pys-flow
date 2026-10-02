"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";

/** Mark a single notification (owned by the caller) as read. */
export async function markNotificationRead(id: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/notifications");
}

/** Mark every unread notification for the caller as read. */
export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/notifications");
}

/** Delete a notification owned by the caller. */
export async function deleteNotification(id: string) {
  const user = await requireUser();
  await prisma.notification.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/notifications");
}
