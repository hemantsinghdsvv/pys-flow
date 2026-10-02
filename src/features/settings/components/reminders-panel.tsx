"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  updateReminderSetting,
  sendTestEmail,
} from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type ReminderItem = {
  key: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

function ReminderRow({ reminder }: { reminder: ReminderItem }) {
  const router = useRouter();
  const [hour, setHour] = useState(reminder.hour);
  const [minute, setMinute] = useState(reminder.minute);
  const [enabled, setEnabled] = useState(reminder.enabled);
  const [pending, startTransition] = useTransition();

  function save(next: Partial<ReminderItem>) {
    const payload = {
      key: reminder.key,
      hour: next.hour ?? hour,
      minute: next.minute ?? minute,
      enabled: next.enabled ?? enabled,
    };
    startTransition(async () => {
      try {
        await updateReminderSetting(payload);
        toast.success("Saved");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            setEnabled(v);
            save({ enabled: v });
          }}
        />
        <span className="text-sm font-medium">{reminder.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="w-16"
          aria-label="Hour"
        />
        <span className="text-muted-foreground">:</span>
        <Input
          type="number"
          min={0}
          max={59}
          value={minute}
          onChange={(e) => setMinute(Number(e.target.value))}
          className="w-16"
          aria-label="Minute"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => save({})}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function TestEmailButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const res = await sendTestEmail();
            if (res.sent) toast.success("Test email sent — check your inbox.");
            else toast.error(res.reason ?? "Could not send test email.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Mail className="size-4" />
      )}
      Send test email
    </Button>
  );
}

export function RemindersPanel({ reminders }: { reminders: ReminderItem[] }) {
  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border">
        {reminders.map((r) => (
          <ReminderRow key={r.key} reminder={r} />
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Email delivery</p>
          <p className="text-xs text-muted-foreground">
            Send a test message to your own address to verify SMTP (Brevo) setup.
          </p>
        </div>
        <TestEmailButton />
      </div>
    </div>
  );
}
