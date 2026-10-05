import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("--- Seeding & Updating Pragya Yog School Staff Roster ---");

  // 1. Ensure the 2 primary departments requested by user exist
  const teachingDept = await prisma.department.upsert({
    where: { name: "Teaching Faculty" },
    update: { code: "TEACHING" },
    create: {
      name: "Teaching Faculty",
      code: "TEACHING",
    },
  });

  const opsDept = await prisma.department.upsert({
    where: { name: "Studio Operations & Administrative Staff" },
    update: { code: "OPS_ADMIN" },
    create: {
      name: "Studio Operations & Administrative Staff",
      code: "OPS_ADMIN",
    },
  });

  console.log("Departments verified:", {
    teaching: teachingDept.name,
    ops: opsDept.name,
  });

  // 2. Ensure OrgRoles exist
  const rolesData = [
    { name: "Admin", hierarchyLevel: 1, description: "Full school operations, curriculum, and administrative authority." },
    { name: "Master Teacher", hierarchyLevel: 2, description: "Senior faculty lead, master trainer, and teacher mentor." },
    { name: "Teacher", hierarchyLevel: 2, description: "Senior yoga teacher and workshop lead." },
    { name: "Finance", hierarchyLevel: 2, description: "Financial oversight, accounting, payroll, and billing." },
    { name: "Schedule manager", hierarchyLevel: 2, description: "Studio timetables, class allocations, and event booking." },
    { name: "Instructor", hierarchyLevel: 3, description: "Yoga class instructor and studio practitioner." },
    { name: "Guest teacher", hierarchyLevel: 3, description: "Visiting faculty and workshop guest instructor." },
    { name: "Front desk", hierarchyLevel: 3, description: "Studio reception, front desk operations, and student check-ins." },
    { name: "Operations Lead", hierarchyLevel: 3, description: "Studio management, shop merchandise, and facilities." },
    { name: "Yoga Instructor Intern", hierarchyLevel: 4, description: "Yoga teacher intern and trainee." },
  ];

  const roleMap = new Map<string, string>();
  for (const r of rolesData) {
    const role = await prisma.orgRole.upsert({
      where: { name: r.name },
      update: { hierarchyLevel: r.hierarchyLevel, description: r.description },
      create: r,
    });
    roleMap.set(r.name, role.id);
  }

  // 3. Get Default Studio / Company
  const defaultCompany = await prisma.company.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const companyId = defaultCompany?.id || null;

  // 4. Staff Data Roster
  const staffList = [
    // ═══════════════ CATEGORY 1: TEACHING FACULTY ═══════════════
    {
      name: "Master Aarya",
      email: "aarya@pyshk.com",
      phone: "+852 0000 0001",
      roleName: "Admin",
      deptId: teachingDept.id,
      designation: "Founder Teacher",
      hierarchyLevel: 1,
      isSystemAdmin: true,
    },
    {
      name: "Dr. Yatendra Amoli",
      email: "yatendra@pyshk.com",
      phone: null,
      roleName: "Master Teacher",
      deptId: teachingDept.id,
      designation: "Master Teacher",
      hierarchyLevel: 2,
      isSystemAdmin: false,
    },
    {
      name: "Dr. Usha Jaiswal",
      email: "usha@pyshk.com",
      phone: "+852 1234 5678",
      roleName: "Master Teacher",
      deptId: teachingDept.id,
      designation: "Master Teacher",
      hierarchyLevel: 2,
      isSystemAdmin: false,
    },
    {
      name: "Master Shoaib M",
      email: "shoaib@pyshk.com",
      phone: "+852 0399 6841",
      roleName: "Guest teacher",
      deptId: teachingDept.id,
      designation: "Guest Teacher",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Angela Lee",
      email: "angela@pyshk.com",
      phone: "+852 6081 2325",
      roleName: "Instructor",
      deptId: teachingDept.id,
      designation: "Instructor",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Charlotte Chiu",
      email: "charlotte@pyshk.com",
      phone: "+852 9622 3858",
      roleName: "Instructor",
      deptId: teachingDept.id,
      designation: "Instructor",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Louise",
      email: "louise@pyshk.com",
      phone: "+852 9061 4451",
      roleName: "Instructor",
      deptId: teachingDept.id,
      designation: "Instructor",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Marcus Chen",
      email: "marcus@pyshk.com",
      phone: "+852 9770 0848",
      roleName: "Instructor",
      deptId: teachingDept.id,
      designation: "Instructor",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Alanna Em",
      email: "alanna@pyshk.com",
      phone: "+852 9611 7577",
      roleName: "Instructor",
      deptId: teachingDept.id,
      designation: "Instructor",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Aly Z",
      email: "aly@pyshk.com",
      phone: "+852 9503 7505",
      roleName: "Instructor",
      deptId: teachingDept.id,
      designation: "Instructor",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Jenny",
      email: "jenny@pyshk.com",
      phone: null,
      roleName: "Instructor",
      deptId: teachingDept.id,
      designation: "Instructor",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    // User requirement: Vishal, Aman, Ankit stay on Yoga Instructor Intern role!
    {
      name: "Vishal",
      email: "vishal@pyshk.com",
      phone: null,
      roleName: "Yoga Instructor Intern",
      deptId: teachingDept.id,
      designation: "Yoga Instructor Intern",
      hierarchyLevel: 4,
      isSystemAdmin: false,
    },
    {
      name: "Aman",
      email: "aman@pyshk.com",
      phone: null,
      roleName: "Yoga Instructor Intern",
      deptId: teachingDept.id,
      designation: "Yoga Instructor Intern",
      hierarchyLevel: 4,
      isSystemAdmin: false,
    },
    {
      name: "Ankit",
      email: "ankit@pyshk.com",
      phone: null,
      roleName: "Yoga Instructor Intern",
      deptId: teachingDept.id,
      designation: "Yoga Instructor Intern",
      hierarchyLevel: 4,
      isSystemAdmin: false,
    },

    // ═══════════════ CATEGORY 2: STUDIO OPERATIONS & ADMINISTRATIVE STAFF ═══════════════
    {
      name: "Aarya Kuldeep",
      email: "admin@pyshk.com",
      phone: "+852 0000 0001",
      roleName: "Admin",
      deptId: opsDept.id,
      designation: "School Director & Admin",
      hierarchyLevel: 1,
      isSystemAdmin: true,
    },
    {
      name: "Dr. Rakesh Jaiswal",
      email: "dr.rakeshjaiswal@pyshk.com",
      phone: null,
      roleName: "Master Teacher",
      deptId: opsDept.id,
      designation: "Senior Consultant & Practitioner",
      hierarchyLevel: 2,
      isSystemAdmin: false,
    },
    {
      name: "Kaushal Singh",
      email: "kaushal.singh@pyshk.com",
      phone: "+852 7000 7828",
      roleName: "Operations Lead",
      deptId: opsDept.id,
      designation: "Studio Operations Lead",
      hierarchyLevel: 2,
      isSystemAdmin: false,
    },
    {
      name: "Ananya Sharma (Finance)",
      email: "finance@pyshk.com",
      phone: null,
      roleName: "Finance",
      deptId: opsDept.id,
      designation: "Finance Manager",
      hierarchyLevel: 2,
      isSystemAdmin: false,
    },
    {
      name: "Simran Kaur (Schedule Manager)",
      email: "scheduler@pyshk.com",
      phone: null,
      roleName: "Schedule manager",
      deptId: opsDept.id,
      designation: "Studio Schedule Manager",
      hierarchyLevel: 2,
      isSystemAdmin: false,
    },
    {
      name: "Shop Manager",
      email: "shop@pyshk.com",
      phone: "+852 1234 5678",
      roleName: "Operations Lead",
      deptId: opsDept.id,
      designation: "Studio Shop & Merchandise Manager",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Rahul Mehta (Front Desk)",
      email: "frontdesk@pyshk.com",
      phone: null,
      roleName: "Front desk",
      deptId: opsDept.id,
      designation: "Front Desk & Check-in Coordinator",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Check in PYS",
      email: "checkin@pyshk.com",
      phone: null,
      roleName: "Front desk",
      deptId: opsDept.id,
      designation: "Reception & Check-in Desk",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Team Pragya",
      email: "team@pyshk.com",
      phone: "+852 0000 0000",
      roleName: "Operations Lead",
      deptId: opsDept.id,
      designation: "Central Operations & Support",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
    {
      name: "Pragya Central Coordinator",
      email: "pragya.central@pyshk.com",
      phone: "+852 1334 5678",
      roleName: "Operations Lead",
      deptId: opsDept.id,
      designation: "Central Studio Coordinator",
      hierarchyLevel: 3,
      isSystemAdmin: false,
    },
  ];

  console.log(`Upserting ${staffList.length} staff members...`);

  for (const s of staffList) {
    const roleId = roleMap.get(s.roleName) || null;

    const existing = await prisma.user.findUnique({
      where: { email: s.email },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: s.name,
          phone: s.phone || existing.phone,
          roleId,
          departmentId: s.deptId,
          designation: s.designation,
          hierarchyLevel: s.hierarchyLevel,
          isSystemAdmin: s.isSystemAdmin,
          isActive: true,
          companyId: existing.companyId || companyId,
        },
      });
      console.log(`Updated: ${s.name} (${s.email}) -> ${s.designation} [Dept: ${s.deptId === teachingDept.id ? 'Teaching' : 'Ops'}]`);
    } else {
      await prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          phone: s.phone,
          roleId,
          departmentId: s.deptId,
          designation: s.designation,
          hierarchyLevel: s.hierarchyLevel,
          isSystemAdmin: s.isSystemAdmin,
          isActive: true,
          companyId,
        },
      });
      console.log(`Created: ${s.name} (${s.email}) -> ${s.designation} [Dept: ${s.deptId === teachingDept.id ? 'Teaching' : 'Ops'}]`);
    }
  }

  console.log("--- All staff members successfully seeded and updated! ---");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
