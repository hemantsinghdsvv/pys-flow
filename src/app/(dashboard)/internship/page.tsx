import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { InternshipManager } from "@/features/internships/components/internship-manager";
import { InternMember, StaffChecker } from "@/features/internships/types";

export const metadata: Metadata = {
  title: "Internship Planner & Marks - Pragya Yog School",
  description: "3-Month Yoga Teacher Training Course (TTC) Curriculum, practical evaluation, and daily milestone tracking.",
};

export default async function InternshipPage() {
  const user = await requireUser();

  let interns: InternMember[] = [];
  let staff: StaffChecker[] = [];

  try {
    const [dbInternUsers, dbStaffUsers] = await Promise.all([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { role: "INTERN" },
            { designation: { contains: "Intern", mode: "insensitive" } },
            { studentProfile: { isNot: null } },
          ],
        },
        include: {
          studentProfile: {
            include: {
              batch: { select: { name: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { isSystemAdmin: true },
            { hierarchyLevel: { lte: 2 } },
            { designation: { contains: "Teacher", mode: "insensitive" } },
            { designation: { contains: "Instructor", mode: "insensitive" } },
            { designation: { contains: "Faculty", mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          designation: true,
          email: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    interns = dbInternUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      batch: u.studentProfile?.batch?.name || "TTC-2026",
      rollNumber: u.studentProfile?.rollNumber || undefined,
    }));

    staff = dbStaffUsers.map((s) => ({
      id: s.id,
      name: s.name,
      designation: s.designation || "Yoga Faculty",
      email: s.email,
    }));
  } catch (err) {
    console.warn("Could not query DB for interns/staff, using default roster:", err);
  }

  if (interns.length === 0) {
    interns = [
      { id: "i1", name: "Vishal", batch: "TTC-2026" },
      { id: "i2", name: "Aman", batch: "TTC-2026" },
      { id: "i3", name: "Ankit", batch: "TTC-2026" },
      { id: "i4", name: "Priya Sharma", batch: "TTC-2026" },
      { id: "i5", name: "Rahul Verma", batch: "TTC-2026" },
      { id: "i6", name: "Ananya Iyer", batch: "TTC-2026" },
    ];
  }

  if (staff.length === 0) {
    staff = [
      { id: "s1", name: "Master Devendra", designation: "Senior Yoga Teacher" },
      { id: "s2", name: "Pooja Verma", designation: "Yoga Instructor" },
      { id: "s3", name: "Dr. K. Swaminathan", designation: "Guest Teacher & Philosophy" },
      { id: "s4", name: "Aarya Kuldeep", designation: "Administrator" },
    ];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pragya Yog School — Internship Planner & Marks"
        description="3-Month Yoga Teacher Training Course (TTC) Curriculum · Practical Evaluation · Daily Milestones"
      />

      <InternshipManager
        initialInterns={interns}
        initialStaff={staff}
        currentUser={{
          id: user.id,
          name: user.name,
          role: user.role,
          isSystemAdmin: user.isSystemAdmin || false,
          hierarchyLevel: user.hierarchyLevel,
        }}
      />
    </div>
  );
}
