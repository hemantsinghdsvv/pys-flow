"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addDepartment,
  deleteDepartment,
  addTechnology,
  deleteTechnology,
} from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type TaxonomyItem = { id: string; name: string; extra: string | null };

export function TaxonomyPanel({
  kind,
  items,
  namePlaceholder,
  extraPlaceholder,
}: {
  kind: "department" | "technology";
  items: TaxonomyItem[];
  namePlaceholder: string;
  extraPlaceholder: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [pending, startTransition] = useTransition();

  function onAdd() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        if (kind === "department") {
          await addDepartment({ name: name.trim(), code: extra.trim() });
        } else {
          await addTechnology({ name: name.trim(), category: extra.trim() });
        }
        setName("");
        setExtra("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        if (kind === "department") await deleteDepartment(id);
        else await deleteTechnology(id);
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
          placeholder={namePlaceholder}
        />
        <Input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={extraPlaceholder}
          className="sm:max-w-48"
        />
        <Button onClick={onAdd} disabled={pending || !name.trim()}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item.id}
              variant="outline"
              className="gap-1.5 py-1 pl-2.5 pr-1 text-sm"
            >
              {item.name}
              {item.extra && (
                <span className="text-muted-foreground">({item.extra})</span>
              )}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                disabled={pending}
                onClick={() => onDelete(item.id)}
                className="ml-0.5 rounded-sm text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
