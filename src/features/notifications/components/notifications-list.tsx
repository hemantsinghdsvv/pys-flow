"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCheck, Trash2, Bell } from "lucide-react";
import { toast } from "sonner";
import type { NotificationType } from "@prisma/client";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/features/notifications/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationsList({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const unread = notifications.filter((n) => !n.isRead).length;

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="You're all caught up"
        description="Notifications about tasks, reviews, and deadlines will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(markAllNotificationsRead)}
          >
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        </div>
      )}
      <ul className="divide-y rounded-lg border">
        {notifications.map((n) => {
          const body = (
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.isRead ? "bg-transparent" : "bg-primary"
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm",
                    n.isRead ? "font-normal" : "font-semibold"
                  )}
                >
                  {n.title}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {n.message}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          );

          return (
            <li
              key={n.id}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                !n.isRead && "bg-muted/30"
              )}
            >
              {n.link ? (
                <Link
                  href={n.link}
                  className="min-w-0 flex-1 hover:opacity-80"
                  onClick={() =>
                    !n.isRead && run(() => markNotificationRead(n.id))
                  }
                >
                  {body}
                </Link>
              ) : (
                <div className="min-w-0 flex-1">{body}</div>
              )}
              <div className="flex shrink-0 items-center gap-1">
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Mark read"
                    disabled={pending}
                    onClick={() => run(() => markNotificationRead(n.id))}
                  >
                    <Check className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  aria-label="Delete notification"
                  disabled={pending}
                  onClick={() => run(() => deleteNotification(n.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
