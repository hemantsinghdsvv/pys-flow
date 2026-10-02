import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const PASSWORD = "Password@123";

async function createUser(opts: {
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "COORDINATOR" | "MENTOR" | "STUDENT";
  companyId?: string | null;
  designation?: string;
}) {
  const passwordHash = await hashPassword(PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {},
    create: {
      name: opts.name,
      email: opts.email,
      emailVerified: true,
      role: opts.role,
      isSystemAdmin: opts.role === "SUPER_ADMIN",
      hierarchyLevel: opts.role === "SUPER_ADMIN" ? 1 : opts.role === "COMPANY_ADMIN" ? 2 : opts.role === "MENTOR" ? 3 : 4,
      companyId: opts.companyId ?? null,
      designation: opts.designation,
      accounts: {
        create: {
          accountId: opts.email,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
  return user;
}

async function main() {
  console.log("Seeding DRISHTI...");

  // ── Super Admin ──
  const superAdmin = await createUser({
    name: "Hemant Singh",
    email: "admin@drishti.dev",
    role: "SUPER_ADMIN",
    designation: "Head, Software Development Cell",
  });

  // ── Settings data ──
  await prisma.academicYear.upsert({
    where: { label: "2026-27" },
    update: {},
    create: {
      label: "2026-27",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  const departments = ["Computer Science", "Information Technology", "AI & DS"];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name, code: name.replace(/[^A-Z]/g, "") },
    });
  }

  const technologies: Array<[string, string]> = [
    ["React", "Frontend"],
    ["Next.js", "Frontend"],
    ["TypeScript", "Language"],
    ["Node.js", "Backend"],
    ["Python", "Language"],
    ["Django", "Backend"],
    ["Flutter", "Mobile"],
    ["PostgreSQL", "Database"],
    ["MongoDB", "Database"],
    ["TensorFlow", "AI/ML"],
    ["Docker", "DevOps"],
    ["Figma", "Design"],
  ];
  for (const [name, category] of technologies) {
    await prisma.technology.upsert({
      where: { name },
      update: {},
      create: { name, category },
    });
  }

  const holidays: Array<[string, string]> = [
    ["Independence Day", "2026-08-15"],
    ["Gandhi Jayanti", "2026-10-02"],
    ["Diwali", "2026-11-08"],
  ];
  for (const [name, date] of holidays) {
    const existing = await prisma.holiday.findFirst({
      where: { name, companyId: null },
    });
    if (!existing) {
      await prisma.holiday.create({
        data: { name, date: new Date(date) },
      });
    }
  }

  // ── Companies ──
  const companiesData = [
    {
      name: "TechNova Solutions",
      slug: "technova-solutions",
      description:
        "Product engineering company building SaaS platforms for logistics and supply chain.",
      industry: "Software Products",
      website: "https://technova.example.com",
      contactPerson: "Rohit Sharma",
      contactEmail: "rohit@technova.example.com",
      internshipDuration: "12 weeks",
      internshipType: "HYBRID" as const,
      themeColor: "#6366f1",
      techStack: ["React", "Next.js", "Node.js", "PostgreSQL"],
    },
    {
      name: "DataMind AI Labs",
      slug: "datamind-ai-labs",
      description:
        "Applied AI research lab working on NLP, computer vision, and predictive analytics.",
      industry: "Artificial Intelligence",
      website: "https://datamind.example.com",
      contactPerson: "Priya Patel",
      contactEmail: "priya@datamind.example.com",
      internshipDuration: "16 weeks",
      internshipType: "REMOTE" as const,
      themeColor: "#0ea5e9",
      techStack: ["Python", "TensorFlow", "MongoDB"],
    },
    {
      name: "PixelForge Studio",
      slug: "pixelforge-studio",
      description:
        "Digital design and mobile development studio crafting consumer apps.",
      industry: "Design & Mobile",
      website: "https://pixelforge.example.com",
      contactPerson: "Arjun Mehta",
      contactEmail: "arjun@pixelforge.example.com",
      internshipDuration: "8 weeks",
      internshipType: "ONSITE" as const,
      themeColor: "#f59e0b",
      techStack: ["Flutter", "Figma", "Node.js"],
    },
  ];

  for (const [i, data] of companiesData.entries()) {
    const company = await prisma.company.upsert({
      where: { slug: data.slug },
      update: {},
      create: { ...data, createdById: superAdmin.id },
    });
    const n = i + 1;

    await createUser({
      name: `Company Admin ${n}`,
      email: `admin${n}@company.dev`,
      role: "COMPANY_ADMIN",
      companyId: company.id,
      designation: "Internship Program Head",
    });
    await createUser({
      name: `Coordinator ${n}`,
      email: `coordinator${n}@company.dev`,
      role: "COORDINATOR",
      companyId: company.id,
      designation: "Internship Coordinator",
    });

    for (let m = 1; m <= 2; m++) {
      await createUser({
        name: `Mentor ${n}.${m}`,
        email: `mentor${n}-${m}@company.dev`,
        role: "MENTOR",
        companyId: company.id,
        designation: "Senior Engineer",
      });
    }

    const studentNames = [
      "Aarav Gupta",
      "Diya Verma",
      "Kabir Joshi",
      "Meera Nair",
      "Vihaan Rao",
    ];
    for (const [s, studentName] of studentNames.entries()) {
      const student = await createUser({
        name: `${studentName}`,
        email: `student${n}-${s + 1}@university.edu`,
        role: "STUDENT",
        companyId: company.id,
      });
      await prisma.studentProfile.upsert({
        where: { userId: student.id },
        update: {},
        create: {
          userId: student.id,
          companyId: company.id,
          rollNumber: `CS26${n}${(s + 1).toString().padStart(2, "0")}`,
          department: "Computer Science",
          skills: ["JavaScript", "React", "Git"],
          githubUrl: `https://github.com/student${n}-${s + 1}`,
        },
      });
    }
    // ── Batch ──
    let batch = await prisma.batch.findFirst({
      where: { companyId: company.id, name: "Summer Internship 2026" },
    });
    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          companyId: company.id,
          name: "Summer Internship 2026",
          description: "Flagship summer cohort.",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-08-31"),
          status: "ACTIVE",
          createdById: superAdmin.id,
        },
      });
    }

    const companyStudents = await prisma.user.findMany({
      where: { companyId: company.id, role: "STUDENT" },
      orderBy: { email: "asc" },
    });
    const companyMentors = await prisma.user.findMany({
      where: { companyId: company.id, role: "MENTOR" },
      orderBy: { email: "asc" },
    });

    await prisma.studentProfile.updateMany({
      where: { companyId: company.id, batchId: null },
      data: { batchId: batch.id },
    });

    // ── Projects ──
    const projectDefs = [
      {
        name: `${company.name.split(" ")[0]} Portal`,
        description:
          "Internal portal with dashboards, role-based access, and reporting.",
        objective: "Learn full-stack development with real product constraints.",
        techStack: data.techStack,
        difficulty: "INTERMEDIATE" as const,
        deliverables: "Working app\nDocumentation\nFinal presentation",
        status: "ACTIVE" as const,
        priority: "HIGH" as const,
      },
      {
        name: `${company.name.split(" ")[0]} Mobile App`,
        description: "Companion mobile experience for the core product.",
        objective: "Ship a production-quality mobile client.",
        techStack: data.techStack.slice(0, 2),
        difficulty: "ADVANCED" as const,
        deliverables: "App build\nAPI integration\nQA report",
        status: "PLANNING" as const,
        priority: "MEDIUM" as const,
      },
    ];

    for (const [pi, def] of projectDefs.entries()) {
      let project = await prisma.project.findFirst({
        where: { companyId: company.id, name: def.name },
      });
      if (!project) {
        project = await prisma.project.create({
          data: {
            ...def,
            companyId: company.id,
            batchId: batch.id,
            startDate: new Date("2026-06-08"),
            endDate: new Date("2026-08-24"),
            repositoryUrl: `https://github.com/${data.slug}/${def.name.toLowerCase().replace(/\s+/g, "-")}`,
            createdById: superAdmin.id,
          },
        });
        await prisma.repository.create({
          data: {
            projectId: project.id,
            name: def.name,
            url: project.repositoryUrl!,
          },
        });
        // mentor + students
        const mentor = companyMentors[pi % companyMentors.length];
        await prisma.projectMentor.create({
          data: { projectId: project.id, userId: mentor.id },
        });
        const assigned = companyStudents.slice(pi * 2, pi * 2 + 3);
        await prisma.projectStudent.createMany({
          data: assigned.map((s) => ({ projectId: project!.id, userId: s.id })),
          skipDuplicates: true,
        });
        // milestones
        await prisma.milestone.createMany({
          data: [
            {
              projectId: project.id,
              title: "Requirements & setup",
              status: "COMPLETED",
              order: 0,
              dueDate: new Date("2026-06-19"),
              createdById: superAdmin.id,
            },
            {
              projectId: project.id,
              title: "MVP release",
              status: "IN_PROGRESS",
              order: 1,
              dueDate: new Date("2026-07-24"),
              createdById: superAdmin.id,
            },
            {
              projectId: project.id,
              title: "Final delivery",
              status: "PENDING",
              order: 2,
              dueDate: new Date("2026-08-21"),
              createdById: superAdmin.id,
            },
          ],
        });
        // team
        const team = await prisma.team.create({
          data: {
            companyId: company.id,
            projectId: project.id,
            name: `${def.name} Team`,
            createdById: superAdmin.id,
          },
        });
        await prisma.teamMember.createMany({
          data: assigned.map((s, si) => ({
            teamId: team.id,
            userId: s.id,
            role:
              si === 0
                ? ("FULLSTACK_DEVELOPER" as const)
                : si === 1
                  ? ("FRONTEND_DEVELOPER" as const)
                  : ("BACKEND_DEVELOPER" as const),
            isLeader: si === 0,
          })),
        });
      }
    }

    console.log(`  ✓ ${company.name}`);
  }

  console.log("\nSeed complete. Login credentials (password for all):");
  console.log(`  Password: ${PASSWORD}`);
  console.log("  Super Admin:  admin@drishti.dev");
  console.log("  Comp. Admins: admin1@company.dev … admin3@company.dev");
  console.log("  Coordinators: coordinator1@company.dev …");
  console.log("  Mentors:      mentor1-1@company.dev …");
  console.log("  Students:     student1-1@university.edu …");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
