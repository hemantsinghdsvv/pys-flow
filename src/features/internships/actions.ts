"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { can } from "@/lib/permissions";
import { Priority, TaskStatus, ReviewVerdict } from "@prisma/client";
import { notify } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

export async function assignBatchTask(values: {
  batchId: string;
  projectId?: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  priority: Priority;
  deadline?: string;
}) {
  const user = await requireUser();
  const canManage =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "task:create") ||
    can(user, "task:assign");

  if (!canManage) {
    throw new Error("Only supervisors, lead teachers, or administrators can dispatch batch tasks.");
  }

  const batch = await prisma.batch.findUnique({
    where: { id: values.batchId },
    include: {
      projects: { where: { deletedAt: null }, select: { id: true, name: true }, take: 1 },
      students: {
        where: { deletedAt: null },
        include: { user: true },
      },
    },
  });

  if (!batch) throw new Error("Batch not found");
  const internStudents = batch.students.filter(
    (s) => s.user.hierarchyLevel === 4
  );

  if (internStudents.length === 0) {
    throw new Error("No Level 4 interns found in this batch cohort to assign tasks to.");
  }

  assertCompanyAccess(user, batch.companyId);

  const resolvedProjectId = values.projectId || batch.projects[0]?.id || null;
  const deadlineDate = values.deadline ? new Date(values.deadline) : null;

  const createdTasks = [];
  for (const student of internStudents) {
    const task = await prisma.task.create({
      data: {
        title: values.title,
        description: values.description || `Batch Assignment for ${batch.name}`,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
        priority: values.priority || "MEDIUM",
        status: "PENDING",
        deadline: deadlineDate,
        projectId: resolvedProjectId,
        companyId: batch.companyId,
        assigneeId: student.userId,
        createdById: user.id,
      },
    });

    createdTasks.push(task);

    await notify({
      userId: student.userId,
      type: "TASK_ASSIGNED",
      title: `Task Assigned: ${values.title}`,
      message: `${user.name} assigned a new task for cohort "${batch.name}".`,
      link: `/internship`,
    });
  }

  await logActivity({
    userId: user.id,
    companyId: batch.companyId,
    action: "CREATE",
    entityType: "Task",
    entityName: values.title,
    details: { batchId: batch.id, count: createdTasks.length },
  });

  revalidatePath("/internship");
  revalidatePath("/tasks");
  revalidatePath("/kanban");

  return { success: true, count: createdTasks.length };
}

export async function assignIndividualInternTask(values: {
  internUserId: string;
  batchId?: string;
  projectId?: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  priority: Priority;
  deadline?: string;
}) {
  const user = await requireUser();
  const canManage =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "task:create") ||
    can(user, "task:assign");

  if (!canManage) {
    throw new Error("Only supervisors, lead teachers, or administrators can assign tasks.");
  }

  const intern = await prisma.user.findUnique({
    where: { id: values.internUserId },
    include: {
      studentProfile: {
        include: {
          batch: {
            include: {
              projects: { where: { deletedAt: null }, select: { id: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!intern) throw new Error("Intern not found");

  const resolvedProjectId =
    values.projectId ||
    intern.studentProfile?.batch?.projects[0]?.id ||
    null;
  const companyId = intern.studentProfile?.companyId || intern.companyId || null;

  const task = await prisma.task.create({
    data: {
      title: values.title,
      description: values.description || null,
      estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
      priority: values.priority || "MEDIUM",
      status: "PENDING",
      deadline: values.deadline ? new Date(values.deadline) : null,
      projectId: resolvedProjectId,
      companyId,
      assigneeId: values.internUserId,
      createdById: user.id,
    },
  });

  await notify({
    userId: values.internUserId,
    type: "TASK_ASSIGNED",
    title: `Task Assigned: ${values.title}`,
    message: `${user.name} assigned you "${values.title}".`,
    link: `/internship`,
  });

  await logActivity({
    userId: user.id,
    companyId,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    entityName: values.title,
  });

  revalidatePath("/internship");
  revalidatePath("/tasks");
  revalidatePath("/kanban");

  return { success: true, taskId: task.id };
}

export async function submitInternTaskForReview(taskId: string, notes?: string) {
  const user = await requireUser();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true, mentors: { select: { userId: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!task) throw new Error("Task not found");
  if (
    task.assigneeId !== user.id &&
    user.isSystemAdmin !== true &&
    (user.hierarchyLevel == null || user.hierarchyLevel > 2)
  ) {
    throw new Error("You can only submit tasks assigned to you.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "REVIEW" },
  });

  if (notes && notes.trim()) {
    await prisma.taskComment.create({
      data: {
        taskId,
        authorId: user.id,
        content: `Submitted for evaluation: ${notes.trim()}`,
      },
    });
  }

  // Notify supervisors / creator
  const recipientIds = new Set<string>();
  if (task.createdById && task.createdById !== user.id) recipientIds.add(task.createdById);
  task.project?.mentors?.forEach((m) => {
    if (m.userId !== user.id) recipientIds.add(m.userId);
  });

  for (const recipientId of recipientIds) {
    await notify({
      userId: recipientId,
      type: "REVIEW_REQUESTED",
      title: `Task Ready for Review: ${task.title}`,
      message: `${user.name} submitted "${task.title}" for review.`,
      link: `/internship`,
    });
  }

  await logActivity({
    userId: user.id,
    companyId: task.companyId,
    action: "SUBMIT",
    entityType: "Task",
    entityId: taskId,
    entityName: task.title,
  });

  revalidatePath("/internship");
  revalidatePath("/tasks");
  revalidatePath("/kanban");

  return { success: true };
}

export async function reviewInternTask(values: {
  taskId: string;
  verdict: ReviewVerdict;
  rating?: number | null;
  feedback: string;
}) {
  const user = await requireUser();
  const canReview =
    user.isSystemAdmin === true ||
    (user.hierarchyLevel != null && user.hierarchyLevel <= 2) ||
    can(user, "review:create");

  if (!canReview) {
    throw new Error("Only supervisors, lead teachers, or administrators can submit evaluations.");
  }

  const task = await prisma.task.findUnique({
    where: { id: values.taskId },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  if (!task) throw new Error("Task not found");
  if (!task.assigneeId) throw new Error("Task has no intern assigned to review.");

  assertCompanyAccess(user, task.companyId);

  const review = await prisma.review.create({
    data: {
      companyId: task.companyId,
      targetType: "TASK",
      targetId: task.id,
      revieweeId: task.assigneeId,
      reviewerId: user.id,
      verdict: values.verdict,
      rating: values.rating ?? null,
      feedback: values.feedback,
    },
  });

  const nextStatus: TaskStatus =
    values.verdict === "APPROVED" ? "COMPLETED" : "PENDING";

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: nextStatus,
      completedAt: values.verdict === "APPROVED" ? new Date() : null,
    },
  });

  // Notify intern with score and feedback
  const ratingText = values.rating ? ` (${values.rating}/5 ★)` : "";
  const verdictLabel =
    values.verdict === "APPROVED"
      ? "Approved & Graded"
      : values.verdict === "REWORK"
      ? "Needs Rework"
      : "Declined";

  await notify({
    userId: task.assigneeId,
    type: "REVIEW_COMPLETED",
    title: `Task ${verdictLabel}${ratingText}: ${task.title}`,
    message: `${user.name} reviewed your task: "${values.feedback.slice(0, 140)}"`,
    link: `/internship`,
  });

  await logActivity({
    userId: user.id,
    companyId: task.companyId,
    action: "REVIEW",
    entityType: "Task",
    entityId: task.id,
    entityName: task.title,
    details: { verdict: values.verdict, rating: values.rating, feedback: values.feedback },
  });

  revalidatePath("/internship");
  revalidatePath("/tasks");
  revalidatePath("/kanban");
  revalidatePath("/reviews");

  return { success: true, reviewId: review.id };
}
