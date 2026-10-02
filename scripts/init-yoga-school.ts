import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const YOGA_ROLES = [
  { name: "Admin", hierarchyLevel: 1, description: "Full school operations, financial, and management authority." },
  { name: "Finance", hierarchyLevel: 2, description: "Financial oversight, accounting, payroll, and billing." },
  { name: "Teacher", hierarchyLevel: 2, description: "Senior yoga teacher, curriculum lead, event proposer and team task assigner." },
  { name: "Schedule manager", hierarchyLevel: 2, description: "Class timetable coordination, studio room booking, and schedule planning." },
  { name: "Instructor", hierarchyLevel: 3, description: "Yoga class instructor and student trainer." },
  { name: "Guest teacher", hierarchyLevel: 3, description: "Visiting faculty and workshop guest instructor." },
  { name: "Front desk", hierarchyLevel: 3, description: "Studio reception, front desk operations, and student assistance." },
];

const YOGA_DEPTS = [
  { name: "Yoga & Teaching", code: "YOGA" },
  { name: "Finance", code: "FIN" },
  { name: "Studio Operations & Front Desk", code: "OPS" },
  { name: "Scheduling & Events", code: "SCHED" },
];

async function main() {
  console.log("Setting up Yoga School Roles & Departments...");

  // 1. Upsert Departments
  const deptMap = new Map<string, string>();
  for (const d of YOGA_DEPTS) {
    const existing = await prisma.department.findFirst({ where: { name: d.name } });
    if (existing) {
      deptMap.set(d.name, existing.id);
    } else {
      const created = await prisma.department.create({ data: d });
      deptMap.set(d.name, created.id);
    }
  }

  // 2. Upsert OrgRoles
  const roleMap = new Map<string, string>();
  for (const r of YOGA_ROLES) {
    const role = await prisma.orgRole.upsert({
      where: { name: r.name },
      update: { hierarchyLevel: r.hierarchyLevel, description: r.description },
      create: r,
    });
    roleMap.set(r.name, role.id);
  }

  // 3. Ensure Super Admin user is linked to Admin role
  const adminRole = roleMap.get("Admin");
  if (adminRole) {
    await prisma.user.updateMany({
      where: {
        OR: [
          { email: "admin@drishti.dev" },
          { email: "admin@example.com" },
          { isSystemAdmin: true },
        ],
      },
      data: {
        roleId: adminRole,
        hierarchyLevel: 1,
        isSystemAdmin: true,
        designation: "School Director & Admin",
      },
    });
  }

  // 4. Create/update sample staff for each Yoga School role
  const sampleStaff = [
    { email: "finance@pragya.yoga", name: "Ananya Sharma (Finance)", roleName: "Finance", deptName: "Finance", designation: "Finance Manager" },
    { email: "teacher@pragya.yoga", name: "Master Devendra (Senior Teacher)", roleName: "Teacher", deptName: "Yoga & Teaching", designation: "Senior Yoga Teacher" },
    { email: "instructor@pragya.yoga", name: "Pooja Verma (Instructor)", roleName: "Instructor", deptName: "Yoga & Teaching", designation: "Yoga Asana Instructor" },
    { email: "guest@pragya.yoga", name: "Dr. K. Swaminathan (Guest)", roleName: "Guest teacher", deptName: "Yoga & Teaching", designation: "Visiting Philosophy Teacher" },
    { email: "frontdesk@pragya.yoga", name: "Rahul Mehta (Front Desk)", roleName: "Front desk", deptName: "Studio Operations & Front Desk", designation: "Studio Coordinator & Reception" },
    { email: "scheduler@pragya.yoga", name: "Simran Kaur (Scheduler)", roleName: "Schedule manager", deptName: "Scheduling & Events", designation: "Studio Schedule Manager" },
  ];

  for (const s of sampleStaff) {
    const roleId = roleMap.get(s.roleName);
    const departmentId = deptMap.get(s.deptName);
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: s.email,
          name: s.name,
          roleId,
          departmentId,
          designation: s.designation,
          hierarchyLevel: YOGA_ROLES.find(r => r.name === s.roleName)?.hierarchyLevel || 3,
          isSystemAdmin: false,
          phone: "9876543210",
        },
      });
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          roleId,
          departmentId,
          designation: s.designation,
          hierarchyLevel: YOGA_ROLES.find(r => r.name === s.roleName)?.hierarchyLevel || 3,
        },
      });
    }
  }

  console.log("Yoga School roles and staff initialized successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
