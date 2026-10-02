"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrgRole } from "@/features/team/actions";

export function AddRoleModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hierarchyLevel, setHierarchyLevel] = useState("3");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    startTransition(async () => {
      try {
        await createOrgRole({
          name,
          description,
          hierarchyLevel: Number(hierarchyLevel),
        });
        toast.success(`Role "${name}" created successfully!`);
        setOpen(false);
        setName("");
        setDescription("");
        setHierarchyLevel("3");
      } catch (err: any) {
        toast.error(err.message || "Failed to create role");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00381F] hover:bg-[#0A4A2B] text-white">
          <Plus className="size-4 mr-2 text-[#D9AE29]" />
          Add New Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif font-bold text-foreground">
            Define New Yoga School Role
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create custom roles (e.g. Pranayama Specialist, Sound Healer, Studio Manager) and assign staff members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Role Title
            </label>
            <Input
              required
              placeholder="e.g. Retreat Coordinator"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hierarchy Level
            </label>
            <Select value={hierarchyLevel} onValueChange={setHierarchyLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 - Executive / Director (Full Rights)</SelectItem>
                <SelectItem value="2">Level 2 - Team Head / Senior Teacher / Manager</SelectItem>
                <SelectItem value="3">Level 3 - Instructor / Staff Member</SelectItem>
                <SelectItem value="4">Level 4 - Sub-role / Intern / Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Responsibilities & Description
            </label>
            <Textarea
              rows={3}
              placeholder="Primary duties and operational permissions for this role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#00381F] hover:bg-[#0A4A2B] text-white"
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Create Role
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
