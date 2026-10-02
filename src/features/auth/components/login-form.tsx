"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users, ShieldCheck, UserCheck, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { mockSuperAdminLogin, loginAsStaffMember } from "@/features/auth/server-actions";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const YOGA_STAFF = [
  { name: "Finance", role: "Finance", email: "finance@pragya.yoga", dept: "Finance", level: "Level 2 (Head/Lead)" },
  { name: "Teacher", role: "Teacher", email: "teacher@pragya.yoga", dept: "Yoga & Teaching", level: "Level 2 (Senior Lead)" },
  { name: "Schedule Manager", role: "Schedule manager", email: "scheduler@pragya.yoga", dept: "Scheduling & Events", level: "Level 2 (Lead)" },
  { name: "Instructor", role: "Instructor", email: "instructor@pragya.yoga", dept: "Yoga & Teaching", level: "Level 3 (Staff)" },
  { name: "Guest Teacher", role: "Guest teacher", email: "guest@pragya.yoga", dept: "Yoga & Teaching", level: "Level 3 (Visiting Faculty)" },
  { name: "Front Desk", role: "Front desk", email: "frontdesk@pragya.yoga", dept: "Studio Operations & Front Desk", level: "Level 3 (Staff)" },
];

export function LoginForm({ departments = [] }: { departments?: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdminLogin = () => {
    setLoadingType("admin");
    startTransition(async () => {
      try {
        const res = await mockSuperAdminLogin();
        if (res.success) {
          toast.success("Welcome, Aarya Kuldeep (Admin)");
          router.push(searchParams.get("from") ?? "/dashboard");
          router.refresh();
        } else if (res.error) {
          toast.error(res.error);
        }
      } catch (err: any) {
        toast.error(err.message || "Login failed");
      } finally {
        setLoadingType(null);
      }
    });
  };

  const handleStaffLogin = (staff: typeof YOGA_STAFF[0]) => {
    setLoadingType(staff.email);
    startTransition(async () => {
      try {
        const res = await loginAsStaffMember(staff.email);
        if (res.success) {
          toast.success(`Logged in as ${staff.name} (${staff.role})`);
          router.push(searchParams.get("from") ?? "/dashboard");
          router.refresh();
        } else if (res.error) {
          toast.error(res.error);
        }
      } catch (err: any) {
        toast.error(err.message || "Login failed");
      } finally {
        setLoadingType(null);
      }
    });
  };

  return (
    <div className="w-full space-y-6 bg-card p-8 rounded-2xl shadow-sm border border-border">
      <div className="flex flex-col items-center justify-center space-y-3 text-center">
        <div className="size-16 relative flex items-center justify-center p-2 rounded-2xl bg-white shadow-sm ring-1 ring-border">
          <Image
            src="/logo.svg"
            alt="Pragya Yog School"
            width={56}
            height={56}
            className="object-contain"
            priority
          />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-normal text-foreground">
            Pragya Yog School
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#944426] mt-1">
            Central Hong Kong · Staff & Management Portal
          </p>
        </div>
      </div>

      {/* Admin Section (Aarya Kuldeep) */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-[#00381F]" />
          Director & Full Administrator
        </div>
        <Button
          onClick={handleAdminLogin}
          disabled={loadingType !== null}
          className="w-full h-12 bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] font-medium shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {loadingType === "admin" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4 text-[#D9AE29]" />
          )}
          <span>Login as Aarya Kuldeep (Admin)</span>
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-medium">Or Operational Roles</span>
        </div>
      </div>

      {/* Staff Roles Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5 text-[#00381F]" />
            Yoga School Roles
          </span>
          <span className="text-[11px] font-normal">Add team members once logged in</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
          {YOGA_STAFF.map((staff) => {
            const isLoading = loadingType === staff.email;
            return (
              <button
                key={staff.email}
                type="button"
                disabled={loadingType !== null}
                onClick={() => handleStaffLogin(staff)}
                className="text-left p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 hover:border-[#00381F]/40 transition flex flex-col justify-between group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-foreground group-hover:text-[#00381F] transition">
                    {staff.name}
                  </span>
                  {isLoading && <Loader2 className="size-3 animate-spin text-[#00381F]" />}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  <div>{staff.dept}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{staff.level}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
