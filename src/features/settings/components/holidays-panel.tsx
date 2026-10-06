"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Plus, Trash2, Calendar } from "lucide-react";
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
        toast.success(`Added holiday "${name.trim()}"`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add holiday");
      }
    });
  }

  function onDelete(id: string, holidayName: string) {
    startTransition(async () => {
      try {
        await deleteHoliday(id);
        toast.success(`Removed holiday "${holidayName}"`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete holiday");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Holiday name (e.g. Mid-Autumn Festival)"
          className="text-xs bg-muted/20"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sm:max-w-44 text-xs bg-muted/20"
        />
        <Button
          onClick={onAdd}
          disabled={pending || !name.trim() || !date}
          className="bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B] text-xs h-9 shrink-0 gap-1.5 shadow-xs"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Add Holiday
        </Button>
      </div>

      {holidays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center bg-card/40">
          <Calendar className="size-6 mx-auto text-muted-foreground/60 mb-1.5" />
          <p className="text-xs font-semibold text-muted-foreground">No upcoming holidays configured.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div>
                <p className="text-xs font-semibold text-foreground">{h.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(h.date), "EEEE, d MMM yyyy")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label={`Delete ${h.name}`}
                disabled={pending}
                onClick={() => onDelete(h.id, h.name)}
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
