"use client";

import { useState, useTransition } from "react";
import { Loader2, UserCheck, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { assignStaffRole } from "@/features/team/actions";

export function AssignRoleDialog({
  user,
  roles,
  departments,
}: {
  user: { id: string; name: string; email: string; roleId?: string | null; departmentId?: string | null; designation?: string | null };
  roles: { id: string; name: string; hierarchyLevel?: number | null }[];
  departments: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [roleId, setRoleId] = useState(user.roleId || roles[0]?.id || "");
  const [departmentId, setDepartmentId] = useState(user.departmentId || "");
  const [designation, setDesignation] = useState(user.designation || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId) {
      toast.error("Please select a role.");
      return;
    }

    startTransition(async () => {
      try {
        await assignStaffRole({
          userId: user.id,
          roleId,
          departmentId: departmentId || undefined,
          designation,
        });
        toast.success(`Role assigned to ${user.name}!`);
        setOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to assign role");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <UserCheck className="size-3.5 mr-1 text-[#00381F]" />
          Assign Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif font-bold text-foreground">
            Assign Role & Team
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure {user.name}&apos;s authority, team assignment, and designation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Staff Member
            </label>
            <div className="p-2.5 rounded-lg bg-muted/50 border text-xs font-medium">
              <span className="font-bold text-foreground">{user.name}</span> ({user.email})
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Role
            </label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} (Level {r.hierarchyLevel ?? 3})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Department / Team
            </label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned / General" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None / General</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Display Designation
            </label>
            <Input
              placeholder="e.g. Lead Hatha Yoga Instructor"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
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
              Save Assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
