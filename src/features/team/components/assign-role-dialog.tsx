"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Pencil, Shield, Building2, MapPin, Mail, Phone, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { updateStaffMemberProfile } from "@/features/team/actions";

interface AssignRoleDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    roleId?: string | null;
    departmentId?: string | null;
    companyId?: string | null;
    designation?: string | null;
    isActive?: boolean | null;
  };
  roles: { id: string; name: string; hierarchyLevel?: number | null }[];
  departments: { id: string; name: string }[];
  studios?: { id: string; name: string }[];
}

export function AssignRoleDialog({
  user,
  roles,
  departments,
  studios = [],
}: AssignRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [roleId, setRoleId] = useState(user.roleId || roles[0]?.id || "");
  const [departmentId, setDepartmentId] = useState(user.departmentId || "none");
  const [companyId, setCompanyId] = useState(user.companyId || "none");
  const [designation, setDesignation] = useState(user.designation || "");
  const [isActive, setIsActive] = useState(user.isActive ?? true);

  // Sync state when dialog opens or user props change
  useEffect(() => {
    if (open) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || "");
      setRoleId(user.roleId || roles[0]?.id || "");
      setDepartmentId(user.departmentId || "none");
      setCompanyId(user.companyId || "none");
      setDesignation(user.designation || "");
      setIsActive(user.isActive ?? true);
    }
  }, [open, user, roles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter staff member's full name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!roleId) {
      toast.error("Please select a role.");
      return;
    }

    startTransition(async () => {
      try {
        await updateStaffMemberProfile({
          userId: user.id,
          name,
          email,
          phone: phone || undefined,
          roleId,
          departmentId: departmentId === "none" ? undefined : departmentId,
          companyId: companyId === "none" ? undefined : companyId,
          designation,
          isActive,
        });
        toast.success(`Profile & role for ${name} updated successfully!`);
        setOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to update profile");
      }
    });
  };

  const selectedRole = roles.find((r) => r.id === roleId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-[#00381F]/30 hover:bg-[#00381F]/5 text-[#00381F]">
          <Pencil className="size-3.5 mr-1 text-[#00381F]" />
          Edit Profile & Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#00381F]/10 text-[#00381F]">
              <UserIcon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-foreground">
                Edit Staff Profile & Role
              </DialogTitle>
              <DialogDescription className="text-xs">
                Administrator access: modify contact details, organization role, studio, and permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 text-sm">
          {/* Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <UserIcon className="size-3.5" />
                Full Name
              </label>
              <Input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="size-3.5" />
                Email Address
              </label>
              <Input
                type="email"
                placeholder="user@pyshk.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="size-3.5" />
                Phone / WhatsApp
              </label>
              <Input
                placeholder="+852 9123 4567 or +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                Studio Location
              </label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Studios / Global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Studios / Pragya Global</SelectItem>
                  {studios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Role & Department */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-serif uppercase tracking-wider text-[#00381F] flex items-center gap-1.5">
                <Shield className="size-3.5" />
                Organizational Hierarchy & Role
              </span>
              {selectedRole && (
                <Badge variant="outline" className="text-[10px] bg-background">
                  Level {selectedRole.hierarchyLevel ?? 3}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Assigned Role
                </label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger className="bg-background">
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  Department / Team
                </label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="None / General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / General</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Display Designation / Title
              </label>
              <Input
                placeholder="e.g. Lead Hatha Yoga Instructor / Studio Supervisor"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          {/* Account Status */}
          <div className="p-3 rounded-lg border border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground">Active Staff Member</div>
              <div className="text-[11px] text-muted-foreground">
                Staff member can log in, view assigned tasks, and participate in yoga operations.
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
