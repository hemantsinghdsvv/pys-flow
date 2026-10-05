import type { Metadata } from "next";
import { requireUser, companyFilter } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { InternshipHub } from "@/features/internships/components/internship-hub";

export const metadata: Metadata = {
  title: "Internship & Cohort Management - Pragya Yog School",
  description:
    "Task evaluations, practical scorecards, and supervisor feedback for Pragya Yog School training cohorts.",
};

export default async function InternshipPage() {
  const user = await requireUser();
  const scope = await companyFilter(user);

  // 1. Fetch batches with enrolled interns, company location, and linked projects
  const batches = await prisma.batch.findMany({
    where: {
      ...scope,
      deletedAt: null,
    },
    orderBy: { startDate: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      projects: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          status: true,
          students: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                  hierarchyLevel: true,
                  orgRole: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      students: {
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              hierarchyLevel: true,
              orgRole: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  // 2. Fetch tasks linked to projects or interns in these batches
  const tasks = await prisma.task.findMany({
    where: {
      ...scope,
      deletedAt: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          batchId: true,
          batch: { select: { id: true, name: true } },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          hierarchyLevel: true,
          orgRole: { select: { name: true } },
          studentProfile: {
            select: {
              id: true,
              batchId: true,
              batch: { select: { id: true, name: true } },
            },
          },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: "asc" },
      { updatedAt: "desc" },
    ],
  });

  // 3. Fetch reviews on these tasks (verdict, rating, comments, supervisor)
  const taskIds = tasks.map((t) => t.id);
  const reviews =
    taskIds.length > 0
      ? await prisma.review.findMany({
          where: {
            targetType: "TASK",
            targetId: { in: taskIds },
            deletedAt: null,
          },
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                image: true,
                orgRole: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // 4. Attach reviews to each task
  const tasksWithReviews = tasks.map((task) => ({
    ...task,
    reviews: reviews.filter((r) => r.targetId === task.id),
  }));

  return (
    <InternshipHub
      batches={batches}
      tasks={tasksWithReviews}
      currentUser={{
        id: user.id,
        name: user.name,
        role: user.role,
        hierarchyLevel: user.hierarchyLevel,
        isSystemAdmin: user.isSystemAdmin || false,
      }}
    />
  );
}
