import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const PASSWORD = "Password@123";

async function cleanResetDatabase() {
  console.log("==================================================");
  console.log("🧹 DRISHTI: Resetting Database to Brand New Clean Slate");
  console.log("==================================================");

  console.log("1. Deleting all existing events, proposals, tasks, projects, logs...");

  await prisma.proposal.deleteMany({});
  console.log("✓ Deleted all Proposals");

  await prisma.notification.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.dailyTimeline.deleteMany({});
  await prisma.performanceSnapshot.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.repoLink.deleteMany({});
  await prisma.repository.deleteMany({});
  await prisma.dailyLog.deleteMany({});
  console.log("✓ Deleted all Daily Logs, Reviews, Attendance & Performance Snapshots");

  await prisma.taskAcknowledgement.deleteMany({});
  await prisma.taskComment.deleteMany({});
  await prisma.taskDependency.deleteMany({});
  await prisma.task.deleteMany({});
  console.log("✓ Deleted all Tasks, Comments & Dependencies");

  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.projectMentor.deleteMany({});
  await prisma.projectStudent.deleteMany({});
  await prisma.project.deleteMany({});
  console.log("✓ Deleted all Projects, Milestones & Teams");

  await prisma.activityLog.deleteMany({});
  console.log("✓ Deleted all Activity Logs");

  await prisma.studentProfile.deleteMany({});
  await prisma.batch.deleteMany({});
  console.log("✓ Deleted all Batches & Student Profiles");

  // Delete all sessions, accounts, users & companies
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});
  console.log("✓ Deleted all demo Users & Companies");

  // 2. Initialize Brand New Clean Super Admin
  const passwordHash = await hashPassword(PASSWORD);
  const superAdmin = await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "admin@example.com",
      emailVerified: true,
      isSystemAdmin: true,
      designation: "Head of Operations",
      phone: "+1 (555) 010-0000",
      accounts: {
        create: {
          accountId: "admin@example.com",
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
  console.log(`\n✓ Initialized Clean Super Admin: admin@example.com / ${PASSWORD}`);

  // 3. Initialize Default Active Workspace Company
  const defaultCompany = await prisma.company.create({
    data: {
      name: "Drishti Innovations",
      slug: "drishti-innovations",
      status: "ACTIVE",
      description: "Default workspace organization for internship management and events.",
    },
  });
  console.log(`✓ Initialized Default Workspace: ${defaultCompany.name} (${defaultCompany.slug})`);

  // Link super admin to default company
  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { companyId: defaultCompany.id },
  });

  // 4. Seed Standard Reference Taxonomies
  await prisma.academicYear.upsert({
    where: { label: "2026-27" },
    update: { isActive: true },
    create: {
      label: "2026-27",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  const departments = [
    { name: "Computer Science & Engineering", code: "CSE" },
    { name: "Information Technology", code: "IT" },
    { name: "Artificial Intelligence & Data Science", code: "AIDS" },
    { name: "Electronics & Communication", code: "ECE" },
    { name: "Product & UI/UX Design", code: "DESIGN" },
  ];
  for (const dept of departments) {
    let d = await prisma.department.findFirst({ where: { name: dept.name } });
    if (d) {
      await prisma.department.update({ where: { id: d.id }, data: { code: dept.code } });
    } else {
      await prisma.department.create({ data: dept });
    }
  }

  const technologies: Array<[string, string]> = [
    ["React", "Frontend"],
    ["Next.js", "Frontend"],
    ["TypeScript", "Language"],
    ["Node.js", "Backend"],
    ["Python", "Language"],
    ["FastAPI", "Backend"],
    ["PostgreSQL", "Database"],
    ["Docker", "DevOps"],
    ["Figma", "Design"],
  ];
  for (const [name, category] of technologies) {
    await prisma.technology.upsert({
      where: { name },
      update: { category },
      create: { name, category },
    });
  }
  console.log("✓ Initialized standard reference taxonomies (Academic Year, Departments, Tech Stack)");

  console.log("\n==================================================");
  console.log("✨ SYSTEM IS NOW FRESH, BRAND NEW & READY!");
  console.log("==================================================");
  console.log("Login Credentials:");
  console.log("  • Email:    admin@example.com");
  console.log("  • Password: Password@123");
  console.log("==================================================\n");
}

cleanResetDatabase()
  .catch((e) => {
    console.error("Failed to reset database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
