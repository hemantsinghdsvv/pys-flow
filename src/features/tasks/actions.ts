"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertCompanyAccess,
  resolveCompanyForWrite,
} from "@/lib/access";
import { can } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { notify, notifyMany } from "@/lib/notify";
import { storage } from "@/lib/storage";
import { broadcastTaskEvent } from "@/lib/realtime";
import { fetchPragyaAPI } from "@/lib/pragya-api";
import { taskSchema, commentSchema, type TaskValues } from "@/features/tasks/schemas";

async function validateHierarchyAssignment(currentUser: any, assigneeId: string) {
  if (!assigneeId) return;
  if (currentUser.id === assigneeId) {
    return; // Self-assignment allowed
  }

  // Admin has full authority across the school: can assign to any head/manager or any staff member
  const isSuperAdmin =
    currentUser.isSystemAdmin === true ||
    currentUser.role === "Admin" ||
    (currentUser.hierarchyLevel === 1 && !currentUser.departmentId);

  if (isSuperAdmin) {
    return; // Authorized globally across school
  }
  
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, name: true, departmentId: true, hierarchyLevel: true },
  });
  if (!assignee) throw new Error("Assignee not found.");

  // Department rule: Head / Manager of a team (e.g. Finance, Teacher, Schedule manager, Front desk)
  // can ONLY assign tasks within their team / department!
  if (currentUser.departmentId) {
    if (assignee.departmentId !== currentUser.departmentId) {
      throw new Error("Team restriction: You can only assign tasks to staff members within your own department/team.");
    }
  } else {
    throw new Error("Team restriction: Your account is not assigned to a department to assign tasks.");
  }

  // Hierarchy check: team lead can assign to peers or subordinates (level >= current level)
  const activeLevel = currentUser.hierarchyLevel || 3;
  const assignLevel = assignee.hierarchyLevel || 4;
  if (activeLevel > assignLevel) {
    throw new Error("Hierarchy restriction: You cannot assign tasks to a higher-level lead or manager.");
  }
}

/** Statuses a student may move their own task into. */
const STUDENT_ALLOWED_TARGETS: TaskStatus[] = [
  "REVIEW",
];

async function getTaskOrThrow(id: string) {
  const task = await prisma.task.findUnique({ 
    where: { id },
    include: { approval: true }
  });
  if (!task) throw new Error("Task not found");
  return task;
}

function normalize(data: TaskValues) {
  return {
    title: data.title,
    description: data.description || null,
    milestoneId: data.milestoneId || null,
    assigneeId: data.assigneeId || null,
    status: data.status,
    priority: data.priority,
    estimatedHours: data.estimatedHours ? Number(data.estimatedHours) : null,
    deadline: data.deadline ? new Date(data.deadline) : null,
  };
}

async function syncDependencies(taskId: string, dependencyIds: string[]) {
  await prisma.taskDependency.deleteMany({
    where: { taskId, dependsOnId: { notIn: dependencyIds } },
  });
  await prisma.taskDependency.createMany({
    data: dependencyIds
      .filter((depId) => depId !== taskId)
      .map((depId) => ({ taskId, dependsOnId: depId })),
    skipDuplicates: true,
  });
}

export async function createTask(values: TaskValues) {
  const user = await requireUser();
  if (!can(user, "task:create") && !can(user, "task:assign")) {
    throw new Error("Unauthorized to create or assign tasks.");
  }
  const data = taskSchema.parse(values);

  let project = null;

  if (data.projectId) {
    project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });
    if (!project) throw new Error("Project not found");
    // Tasks are now independent, so we don't strictly assert company access here
    // as tasks can exist without companies.
  }

  if (data.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: data.assigneeId },
    });
    if (!assignee) throw new Error("Assignee not found.");
    
    // Strict backend enforcement of assignment hierarchy
    await validateHierarchyAssignment(user, data.assigneeId);
  }
  const maxOrder = await prisma.task.aggregate({
    where: { 
      ...(data.projectId ? { projectId: data.projectId } : { projectId: null }),
      status: data.status 
    },
    _max: { order: true },
  });

  const isSuperAdmin = user.isSystemAdmin === true;

  const task = await prisma.task.create({
    data: {
      ...normalize(data),
      projectId: data.projectId || null,
      parentId: data.parentId || null,
      order: (maxOrder._max?.order ?? 0) + 1,
      createdById: user.id,
      ...(!isSuperAdmin
        ? {
            approval: {
              create: {
                status: "PENDING",
                submittedById: user.id,
              },
            },
          }
        : {}),
    },
  });

  if (data.dependencyIds?.length) {
    await syncDependencies(task.id, data.dependencyIds);
  }

  await logActivity({
    userId: user.id,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    entityName: task.title,
    details: { 
      actionType: 'CREATED_TASK',
      targetUserId: data.assigneeId,
      result: 'SUCCESS'
    }
  });

  if (isSuperAdmin) {
    if (task.assigneeId && task.assigneeId !== user.id) {
      await notify({
        userId: task.assigneeId,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `You were assigned "${task.title}"${project ? ` in ${project.name}` : ""}.`,
        link: `/tasks/${task.id}`,
      });
    }

    broadcastTaskEvent({
      type: "TASK_CREATED",
      taskId: task.id,
      projectId: task.projectId,
      status: task.status,
      order: task.order,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        order: task.order,
        deadline: task.deadline?.toISOString() ?? null,
        projectName: project?.name ?? "General Task",
        projectId: project?.id ?? "",
        assignee: data.assigneeId
          ? {
              id: data.assigneeId,
              name: "Assignee",
              image: null,
            }
          : null,
        subtaskCount: 0,
      },
    });
  } else {
    const superAdmins = await prisma.user.findMany({
      where: { isSystemAdmin: true },
      select: { id: true },
    });
    const saIds = superAdmins.map((u) => u.id);
    if (saIds.length > 0) {
      await notifyMany(saIds, {
        type: "SYSTEM",
        title: "Task Pending Approval",
        message: `${user.name || "A user"} (${user.role}) created task "${task.title}". It requires your approval.`,
        link: `/tasks/${task.id}`,
      });
    }

    // Broadcast real-time approval request
    broadcastTaskEvent({
      type: "TASK_APPROVAL_REQUESTED",
      taskId: task.id,
      projectId: task.projectId,
      role: user.role,
      userId: user.id,
      task: {
        title: task.title,
        createdBy: user.name || user.email,
        createdAt: new Date().toISOString(),
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/kanban");
  return { id: task.id };
}

export async function updateTask(id: string, values: TaskValues) {
  const user = await requireUser();
  if (!can(user, "task:update")) {
    throw new Error("Unauthorized");
  }
  const existing = await getTaskOrThrow(id);

  // Full task managers (have task:assign = teacher/mentor/instructor/coordinator)
  // can update any task.
  // Students and basic users can only update tasks they created or are assigned to.
  const isFullManager =
    user.isSystemAdmin === true ||
    can(user, "task:assign") ||
    can(user, "task:delete");

  if (
    !isFullManager &&
    existing.createdById !== user.id &&
    existing.assigneeId !== user.id
  ) {
    throw new Error("You can only update tasks that you created or are assigned to.");
  }

  if (existing.approval?.status === "DECLINED" && user.isSystemAdmin !== true) {
    throw new Error("This task has been declined and cannot be edited.");
  }

  const data = taskSchema.parse(values);
  
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    // Strict backend enforcement when assignee changes
    await validateHierarchyAssignment(user, data.assigneeId);
  }

  const statusChanged = data.status !== existing.status;

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...normalize(data),
      ...(statusChanged && data.status === "COMPLETED"
        ? { completedAt: new Date() }
        : {}),
    },
  });

  if (data.dependencyIds) await syncDependencies(id, data.dependencyIds);

  if (
    task.assigneeId &&
    task.assigneeId !== existing.assigneeId &&
    task.assigneeId !== user.id
  ) {
    await notify({
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      title: "Task assigned to you",
      message: `You were assigned "${task.title}".`,
      link: `/tasks/${task.id}`,
    });
  }

  await logActivity({
    userId: user.id,
    action: statusChanged ? "STATUS_CHANGE" : "UPDATE",
    entityType: "Task",
    entityId: task.id,
    entityName: task.title,
    details: statusChanged
      ? { from: existing.status, to: data.status }
      : undefined,
  });

  broadcastTaskEvent({
    type: "TASK_UPDATED",
    taskId: task.id,
    projectId: task.projectId,
    status: task.status,
    order: task.order,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      order: task.order,
      deadline: task.deadline?.toISOString() ?? null,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/kanban");
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  if (!can(user, "task:delete")) {
    throw new Error("Unauthorized");
  }
  const existing = await getTaskOrThrow(id);

  // Full task managers (teacher, mentor, instructor, coordinator, company_admin)
  // can delete any task.
  // Regular users can only delete tasks they created.
  const isFullManager =
    user.isSystemAdmin === true ||
    can(user, "task:assign");

  if (!isFullManager && existing.createdById !== user.id) {
    throw new Error("You can only delete tasks that you created.");
  }

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    action: "DELETE",
    entityType: "Task",
    entityId: id,
    entityName: existing.title,
  });

  broadcastTaskEvent({
    type: "TASK_DELETED",
    taskId: id,
  });

  revalidatePath("/tasks");
  revalidatePath("/kanban");
  redirect("/tasks");
}

/** Kanban drag-drop: move a task to a status/position. */
export async function moveTask(
  id: string,
  status: TaskStatus,
  newOrder: number
) {
  const user = await requireUser();
  const allowed =
    can(user, "task:move") ||
    can(user, "task:status_change") ||
    can(user, "event_track:move_card");

  if (!allowed) {
    throw new Error("You do not have permission to move tasks or change status.");
  }

  const task = await getTaskOrThrow(id);

  if (user.role === "INTERN") {
    if (task.assigneeId !== user.id) {
      throw new Error("You can only move your own tasks.");
    }
    if (
      task.status !== status &&
      !STUDENT_ALLOWED_TARGETS.includes(status)
    ) {
      throw new Error(
        "Students can move tasks to Review only."
      );
    }
  }

  const statusChanged = task.status !== status;
  await prisma.task.update({
    where: { id },
    data: {
      status,
      order: newOrder,
      ...(status === "COMPLETED" && statusChanged
        ? { completedAt: new Date() }
        : {}),
    },
  });

  if (statusChanged) {
    await logActivity({
      userId: user.id,
      action: "STATUS_CHANGE",
      entityType: "Task",
      entityId: id,
      entityName: task.title,
      details: { from: task.status, to: status },
    });

    // Notify mentors when a task enters review.
    if (status === "REVIEW" && task.projectId) {
      const mentors = await prisma.projectMentor.findMany({
        where: { projectId: task.projectId },
        select: { userId: true },
      });
      if (mentors.length) {
        await notifyMany(
          mentors.map((m) => m.userId),
          {
            type: "REVIEW_REQUESTED",
            title: "Task ready for review",
            message: `"${task.title}" was moved to Review.`,
            link: `/tasks/${id}`,
          }
        );
      }
    }
  }

  broadcastTaskEvent({
    type: "TASK_MOVED",
    taskId: id,
    projectId: task.projectId,
    status,
    order: newOrder,
  });

  revalidatePath("/kanban");
  revalidatePath(`/tasks/${id}`);
}

// ─────────────────────── comments ───────────────────────

export async function addComment(taskId: string, values: { content: string }) {
  const user = await requireUser();
  const task = await getTaskOrThrow(taskId);

  const data = commentSchema.parse(values);
  await prisma.taskComment.create({
    data: { taskId, authorId: user.id, content: data.content },
  });

  await logActivity({
    userId: user.id,
    action: "COMMENT",
    entityType: "Task",
    entityId: taskId,
    entityName: task.title,
  });

  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new Error("Comment not found");
  if (comment.authorId !== user.id && user.role === "INTERN") {
    throw new Error("You can only delete your own comments.");
  }

  await prisma.taskComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/tasks/${comment.taskId}`);
}

// ─────────────────────── attachments ───────────────────────

export async function addTaskAttachment(taskId: string, formData: FormData) {
  const user = await requireUser();
  const task = await getTaskOrThrow(taskId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }

  const stored = await storage.save(file, `tasks/${taskId}`);
  await prisma.attachment.create({
    data: {
      entityType: "TASK",
      entityId: taskId,
      fileName: stored.fileName,
      filePath: stored.path,
      fileSize: stored.fileSize,
      mimeType: stored.mimeType,
      uploadedById: user.id,
    },
  });

  await logActivity({
    userId: user.id,
    action: "UPLOAD",
    entityType: "Task",
    entityId: taskId,
    entityName: stored.fileName,
  });

  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteAttachment(attachmentId: string) {
  const user = await requireUser();
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) throw new Error("Attachment not found");
  if (attachment.uploadedById !== user.id && user.role === "INTERN") {
    throw new Error("You can only delete your own attachments.");
  }

  await prisma.attachment.update({
    where: { id: attachmentId },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/tasks/${attachment.entityId}`);
}

// ─────────────────────── approvals ───────────────────────

export async function approveTask(taskId: string) {
  const user = await requireUser();
  if (user.isSystemAdmin !== true) {
    throw new Error("Only Super Admins can approve tasks.");
  }

  const approval = await prisma.taskApproval.findUnique({
    where: { taskId },
    include: {
      task: {
        include: {
          project: true,
          assignee: true,
        },
      },
    },
  });

  if (!approval || approval.status !== "PENDING") {
    throw new Error("Task is not pending approval.");
  }

  await prisma.taskApproval.update({
    where: { taskId },
    data: {
      status: "APPROVED",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "REVIEW" },
  });

  await logActivity({
    userId: user.id,
    action: "APPROVE",
    entityType: "Task",
    entityId: taskId,
    entityName: approval.task.title,
  });

  const { task } = approval;

  if (task.assigneeId) {
    await notify({
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: `You were assigned "${task.title}"${task.project ? ` in ${task.project.name}` : ""} (Approved).`,
      link: `/tasks/${task.id}`,
    });
  }

  await notify({
    userId: approval.submittedById,
    type: "SYSTEM",
    title: "Task Approved",
    message: `Your task "${task.title}" has been approved.`,
    link: `/tasks/${task.id}`,
  });

  broadcastTaskEvent({
    type: "TASK_MOVED",
    taskId: task.id,
    projectId: task.projectId,
    status: "REVIEW",
    order: task.order,
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/kanban");
}

export async function declineTask(taskId: string) {
  const user = await requireUser();
  if (user.isSystemAdmin !== true) {
    throw new Error("Only Super Admins can decline tasks.");
  }

  const approval = await prisma.taskApproval.findUnique({
    where: { taskId },
    include: { task: true },
  });

  if (!approval || approval.status !== "PENDING") {
    throw new Error("Task is not pending approval.");
  }

  await prisma.taskApproval.update({
    where: { taskId },
    data: {
      status: "DECLINED",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "CANCELLED" },
  });

  await logActivity({
    userId: user.id,
    action: "REJECT",
    entityType: "Task",
    entityId: taskId,
    entityName: approval.task.title,
  });

  await notify({
    userId: approval.submittedById,
    type: "SYSTEM",
    title: "Task Declined",
    message: `Your task "${approval.task.title}" has been declined.`,
    link: `/tasks/${taskId}`,
  });

  import("@/lib/realtime").then(({ broadcastTaskEvent }) => {
    broadcastTaskEvent({
      type: "TASK_MOVED",
      taskId: taskId,
      status: "CANCELLED",
    });
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/kanban");
}

export async function markTaskAsReview(taskId: string) {
  const user = await requireUser();
  const task = await getTaskOrThrow(taskId);
  

  if (task.assigneeId !== user.id && user.isSystemAdmin !== true) {
    throw new Error("Only the assignee can review this task.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "REVIEW" },
  });

  await logActivity({
    userId: user.id,
    
    action: "STATUS_CHANGE",
    entityType: "Task",
    entityId: taskId,
    entityName: task.title,
    details: { from: task.status, to: "REVIEW" },
  });

  import("@/lib/realtime").then(({ broadcastTaskEvent }) => {
    broadcastTaskEvent({
      type: "TASK_MOVED",
      taskId,
      projectId: task.projectId,
      
      status: "REVIEW",
      order: task.order,
    });
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/kanban");
}

export async function completeTask(taskId: string) {
  const user = await requireUser();
  const task = await getTaskOrThrow(taskId);
  

  const canComplete = user.isSystemAdmin === true || task.createdById === user.id || task.assigneeId === user.id || can(user, "task:update");
  if (!canComplete) {
    throw new Error("You do not have permission to complete this task.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    
    action: "STATUS_CHANGE",
    entityType: "Task",
    entityId: taskId,
    entityName: task.title,
    details: { from: task.status, to: "COMPLETED" },
  });

  import("@/lib/realtime").then(({ broadcastTaskEvent }) => {
    broadcastTaskEvent({
      type: "TASK_MOVED",
      taskId,
      projectId: task.projectId,
      
      status: "COMPLETED",
      order: task.order,
    });
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/kanban");
}

export async function cancelTask(taskId: string) {
  const user = await requireUser();
  const task = await getTaskOrThrow(taskId);
  

  const canCancel = user.isSystemAdmin === true || task.createdById === user.id || task.assigneeId === user.id || can(user, "task:update");
  if (!canCancel) {
    throw new Error("You do not have permission to cancel this task.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "CANCELLED" },
  });

  await logActivity({
    userId: user.id,
    
    action: "STATUS_CHANGE",
    entityType: "Task",
    entityId: taskId,
    entityName: task.title,
    details: { from: task.status, to: "CANCELLED" },
  });

  import("@/lib/realtime").then(({ broadcastTaskEvent }) => {
    broadcastTaskEvent({
      type: "TASK_MOVED",
      taskId,
      projectId: task.projectId,
      
      status: "CANCELLED",
      order: task.order,
    });
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/kanban");
}
