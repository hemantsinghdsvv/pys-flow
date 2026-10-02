"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addHoliday, deleteHoliday } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type HolidayItem = { id: string; name: string; date: string };

export function HolidaysPanel({ holidays }: { holidays: HolidayItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [pending, startTransition] = useTransition();

  function onAdd() {
    if (!name.trim() || !date) return;
    startTransition(async () => {
      try {
        await addHoliday({ name: name.trim(), date });
        setName("");
        setDate("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteHoliday(id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Holiday name"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sm:max-w-48"
        />
        <Button onClick={onAdd} disabled={pending || !name.trim() || !date}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add
        </Button>
      </div>

      {holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground">No holidays configured.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div>
                <p className="text-sm font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(h.date), "EEEE, d MMM yyyy")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${h.name}`}
                disabled={pending}
                onClick={() => onDelete(h.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
