"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/access";
import { Priority, TaskStatus } from "@prisma/client";

export async function assignBatchTask(values: {
  batchId: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  priority: Priority;
  deadline?: string;
}) {
  const user = await requireUser();
  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;
  if (!isAdmin) {
    throw new Error("Only the School Director / CEO can dispatch batch tasks.");
  }

  const batch = await prisma.batch.findUnique({
    where: { id: values.batchId },
    include: {
      students: {
        include: { user: true },
      },
    },
  });

  if (!batch) throw new Error("Batch not found");
  if (batch.students.length === 0) throw new Error("No interns found in this batch.");

  const deadlineDate = values.deadline ? new Date(values.deadline) : null;

  // Create a personalized task for every intern in the batch
  const createdTasks = [];
  for (const student of batch.students) {
    const task = await prisma.task.create({
      data: {
        title: values.title,
        description: values.description || `Batch Assignment for ${batch.name}`,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
        priority: values.priority || "MEDIUM",
        status: "PENDING",
        deadline: deadlineDate,
        assigneeId: student.userId,
        createdById: user.id,
      },
    });

    createdTasks.push(task);

    // Notify intern
    await prisma.notification.create({
      data: {
        userId: student.userId,
        type: "TASK_ASSIGNED",
        title: `Batch Task Assigned: ${values.title}`,
        message: `Director ${user.name} assigned a new task to your batch (${batch.name}).`,
        link: `/tasks/${task.id}`,
      },
    });
  }

  revalidatePath("/internship");
  revalidatePath("/tasks");
  revalidatePath("/kanban");

  return { success: true, count: createdTasks.length };
}

export async function assignIndividualInternTask(values: {
  internUserId: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  priority: Priority;
  deadline?: string;
}) {
  const user = await requireUser();
  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;
  if (!isAdmin) {
    throw new Error("Only the School Director / CEO can personally assign intern tasks.");
  }

  const intern = await prisma.user.findUnique({
    where: { id: values.internUserId },
  });
  if (!intern) throw new Error("Intern not found");

  const task = await prisma.task.create({
    data: {
      title: values.title,
      description: values.description || null,
      estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
      priority: values.priority || "MEDIUM",
      status: "PENDING",
      deadline: values.deadline ? new Date(values.deadline) : null,
      assigneeId: values.internUserId,
      createdById: user.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: values.internUserId,
      type: "TASK_ASSIGNED",
      title: `Personal Task from CEO: ${values.title}`,
      message: `You were directly assigned "${values.title}" by Director ${user.name}.`,
      link: `/tasks/${task.id}`,
    },
  });

  revalidatePath("/internship");
  revalidatePath("/tasks");
  revalidatePath("/kanban");

  return { success: true, taskId: task.id };
}
