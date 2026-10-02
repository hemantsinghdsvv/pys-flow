import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/mailer";
import { renderNotificationEmail } from "@/lib/email/templates";

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  /** Set false to skip the email and only create the in-app notification. */
  email?: boolean;
};

/**
 * Create an in-app notification and (when SMTP is configured) email the user.
 * Email dispatch is fire-and-forget and never blocks or breaks the caller.
 */
export async function notify(input: NotifyInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    },
  });

  if (input.email === false || !isEmailConfigured()) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true, isActive: true },
    });
    if (!user?.email || !user.isActive) return;

    const { subject, html } = await renderNotificationEmail({
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      recipientName: user.name,
    });
    await sendEmail({ to: user.email, subject, html });
  } catch (err) {
    console.error("notify email failed", err);
  }
}

/** Notify several users of the same event (createMany + individual emails). */
export async function notifyMany(
  userIds: string[],
  payload: Omit<NotifyInput, "userId">
): Promise<void> {
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link ?? null,
    })),
  });

  if (payload.email === false || !isEmailConfigured()) return;

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { email: true, name: true },
    });
    await Promise.all(
      users
        .filter((u) => u.email)
        .map(async (u) => {
          const { subject, html } = await renderNotificationEmail({
            type: payload.type,
            title: payload.title,
            message: payload.message,
            link: payload.link,
            recipientName: u.name,
          });
          return sendEmail({ to: u.email, subject, html });
        })
    );
  } catch (err) {
    console.error("notifyMany email failed", err);
  }
}
