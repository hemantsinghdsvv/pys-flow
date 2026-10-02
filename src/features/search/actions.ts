"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, companyFilter } from "@/lib/access";

export type SearchHit = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

export type SearchResults = {
  projects: SearchHit[];
  proposals: SearchHit[];
  students: SearchHit[];
  tasks: SearchHit[];
  companies: SearchHit[];
};

/** Company-scoped global search across the main entities. */
export async function globalSearch(query: string): Promise<SearchResults> {
  const user = await requireUser();
  const q = query.trim();
  const empty: SearchResults = {
    projects: [],
    proposals: [],
    students: [],
    tasks: [],
    companies: [],
  };
  if (q.length < 2) return empty;

  const scope = await companyFilter(user);
  const contains = { contains: q, mode: "insensitive" as const };
  const isStudent = user.role === "INTERN";

  const [projects, proposals, students, tasks, companies] = await Promise.all([
    prisma.project.findMany({
      where: { ...scope, deletedAt: null, name: contains },
      select: { id: true, name: true, status: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.proposal.findMany({
      where: {
        ...scope,
        deletedAt: null,
        title: contains,
        ...(isStudent ? { OR: [{ createdById: user.id }, { status: { in: ["APPROVED", "CONVERTED"] } }] } : {}),
      },
      select: { id: true, title: true, type: true, status: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    isStudent
      ? Promise.resolve([])
      : prisma.user.findMany({
          where: {
            ...scope,
            isSystemAdmin: false,
            deletedAt: null,
            OR: [{ name: contains }, { email: contains }],
          },
          select: { id: true, name: true, email: true },
          take: 5,
          orderBy: { name: "asc" },
        }),
    prisma.task.findMany({
      where: {
        ...scope,
        deletedAt: null,
        title: contains,
        ...(isStudent ? { assigneeId: user.id } : {}),
      },
      select: { id: true, title: true, project: { select: { name: true } } },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    user.isSystemAdmin === true
      ? prisma.company.findMany({
          where: { deletedAt: null, name: contains },
          select: { id: true, name: true, industry: true },
          take: 5,
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    projects: projects.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.status,
      href: `/projects/${p.id}`,
    })),
    proposals: proposals.map((pr) => ({
      id: pr.id,
      label: pr.title,
      sublabel: `${pr.type} · ${pr.status}`,
      href: `/propose/${pr.id}`,
    })),
    students: students.map((s) => ({
      id: s.id,
      label: s.name,
      sublabel: s.email,
      href: `/students/${s.id}`,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      label: t.title,
      sublabel: t.project?.name ?? "General Task",
      href: `/tasks/${t.id}`,
    })),
    companies: companies.map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: c.industry ?? undefined,
      href: `/companies/${c.id}`,
    })),
  };
}

