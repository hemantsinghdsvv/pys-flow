"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Building } from "lucide-react";
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
          toast.success(`Department "${name.trim()}" added.`);
        } else {
          await addTechnology({ name: name.trim(), category: extra.trim() });
          toast.success(`Technology "${name.trim()}" added.`);
        }
        setName("");
        setExtra("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add");
      }
    });
  }

  function onDelete(id: string, itemName: string) {
    startTransition(async () => {
      try {
        if (kind === "department") await deleteDepartment(id);
        else await deleteTechnology(id);
        toast.success(`Removed ${itemName}`);
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
          className="text-xs bg-muted/20"
        />
        <Input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={extraPlaceholder}
          className="sm:max-w-36 text-xs bg-muted/20"
        />
        <Button
          onClick={onAdd}
          disabled={pending || !name.trim()}
          className="bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B] text-xs h-9 shrink-0 gap-1.5 shadow-xs"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center bg-card/40">
          <Building className="size-6 mx-auto text-muted-foreground/60 mb-1.5" />
          <p className="text-xs font-semibold text-muted-foreground">Nothing added yet.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item.id}
              variant="outline"
              className="gap-1.5 py-1 pl-2.5 pr-1.5 text-xs bg-card border-border/80 shadow-xs"
            >
              <span className="font-semibold text-foreground">{item.name}</span>
              {item.extra && (
                <span className="text-muted-foreground font-mono text-[11px]">
                  ({item.extra})
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                disabled={pending}
                onClick={() => onDelete(item.id, item.name)}
                className="ml-1 rounded-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
