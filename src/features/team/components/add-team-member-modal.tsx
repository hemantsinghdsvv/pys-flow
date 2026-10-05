"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2, Sparkles, Building2 } from "lucide-react";
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
import { addTeamMember } from "@/features/team/actions";

interface AddTeamMemberModalProps {
  roles: { id: string; name: string; hierarchyLevel: number | null }[];
  departments: { id: string; name: string }[];
  currentUserLevel: number;
  currentUserDeptId?: string | null;
  isAdmin: boolean;
}

export function AddTeamMemberModal({
  roles,
  departments,
  currentUserLevel,
  currentUserDeptId,
  isAdmin,
}: AddTeamMemberModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  const [departmentId, setDepartmentId] = useState(
    currentUserDeptId || departments[0]?.id || ""
  );
  const [designation, setDesignation] = useState("");

  // Filter roles based on user's hierarchy
  const availableRoles = roles.filter((r) => {
    if (isAdmin) return true;
    // Non-admin can't assign Admin or higher level
    return (r.hierarchyLevel ?? 3) >= currentUserLevel && r.name.toLowerCase() !== "admin";
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Valid email address is required");
      return;
    }
    if (!roleId) {
      toast.error("Please select a role");
      return;
    }

    startTransition(async () => {
      try {
        await addTeamMember({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          roleId,
          departmentId: departmentId || undefined,
          designation: designation.trim() || undefined,
        });

        toast.success(`Team member ${name} added successfully!`);
        setName("");
        setEmail("");
        setPhone("");
        setDesignation("");
        setOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to add team member");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] font-medium shadow-sm transition-all text-xs h-9">
          <UserPlus className="size-4 mr-1.5 text-[#D9AE29]" />
          Add Team Member
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#00381F]">
            <div className="p-2 rounded-lg bg-[#00381F]/10">
              <UserPlus className="size-5 text-[#00381F]" />
            </div>
            <DialogTitle className="font-serif text-lg">Add New Team Member</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Onboard a staff member into Pragya Yog School operations. Team leaders can add members directly to their own teams.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Patel"
              required
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@pyshk.com"
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Phone Number (WhatsApp)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+852 9123 4567"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Organizational Role <span className="text-destructive">*</span>
              </label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name} (Level {r.hierarchyLevel ?? 3})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Department / Team
              </label>
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
                disabled={!isAdmin && Boolean(currentUserDeptId)}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Official Title / Designation
            </label>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Asana Instructor, Accounts Lead, Front Desk Assistant"
              className="text-xs h-9"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-9"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Adding Member...
                </>
              ) : (
                "Add Team Member"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
