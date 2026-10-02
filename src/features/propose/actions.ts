"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  resolveCompanyForWrite,
  assertCompanyAccess,
  requireUser,
  type SessionUser,
} from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { storage } from "@/lib/storage";
import { provisionUser } from "@/features/users/create-user";
import {
  proposalSchema,
  proposalReviewSchema,
  proposalConvertSchema,
  type ProposalValues,
  type ProposalReviewValues,
  type ProposalConvertValues,
} from "@/features/propose/schemas";

function parsePayload(formData: FormData): ProposalValues {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new Error("Missing payload");
  return proposalSchema.parse(JSON.parse(raw));
}

async function saveMedia(formData: FormData): Promise<string | undefined> {
  const file = formData.get("media");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Cover must be an image");
  const stored = await storage.save(file, "proposals/covers");
  return stored.url;
}

async function getProposalOrThrow(id: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      teacher: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!proposal) throw new Error("Proposal not found");
  return proposal;
}

async function resolveTeacherOrMentor(
  teacherName?: string | null,
  teacherIdInput?: string | null,
  companyId?: string | null
): Promise<string | null> {
  if (teacherIdInput && teacherIdInput.trim()) {
    const existing = await prisma.user.findUnique({
      where: { id: teacherIdInput.trim() },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  if (teacherName && teacherName.trim()) {
    const trimmed = teacherName.trim();
    // Search existing user by name (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: {
        name: { equals: trimmed, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return existing.id;

    // Automatically provision mentor account so they can log in, receive notifications, and review
    try {
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
      let email = `${slug || "mentor"}@drishti.internal`;
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        email = `${slug || "mentor"}-${Math.floor(1000 + Math.random() * 9000)}@drishti.internal`;
      }

      const newMentor = await provisionUser({
        name: trimmed,
        email,
        password: "Password@123",
        isSystemAdmin: false,
        companyId: companyId || null,
        designation: "Lead Event Mentor & Review Authority",
      });
      return newMentor.id;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeDatesAndNumbers(data: ProposalValues) {
  return {
    title: data.title,
    type: data.type,
    scheduleType: data.scheduleType,
    locationType: data.locationType,
    locationName: data.locationName || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    dailyHours: data.dailyHours ?? null,
    totalHours: data.totalHours ?? null,
    capacity: data.capacity ?? null,
    teacherName: data.teacherName || null,
    pricing: data.pricing ?? null,
    budget: data.budget ?? null,
    description: data.description,
    objectives: data.objectives || null,
    targetAudience: data.targetAudience || null,
    documentUrl: data.documentUrl || null,
  };
}

async function resolveCompanyIdFromInput(
  user: SessionUser,
  companyName?: string,
  companyIdInput?: string
): Promise<string> {
  if (companyName && companyName.trim()) {
    const trimmed = companyName.trim();
    const existing = await prisma.company.findFirst({
      where: {
        name: { equals: trimmed, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }

    if (user.isSystemAdmin === true) {
      const baseSlug =
        trimmed
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "") || `company-${Date.now()}`;

      const newCompany = await prisma.company.create({
        data: {
          name: trimmed,
          slug: `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`,
          status: "ACTIVE",
        },
      });
      return newCompany.id;
    }
  }

  if (companyIdInput) {
    return resolveCompanyForWrite(user, companyIdInput);
  }

  return resolveCompanyForWrite(user);
}

export async function createProposal(formData: FormData) {
  const user = await requirePermission("proposal:create");
  const data = parsePayload(formData);
  const companyId = await resolveCompanyIdFromInput(user, data.companyName, data.companyId);
  const mediaUrl = await saveMedia(formData);
  const resolvedTeacherId = await resolveTeacherOrMentor(data.teacherName, data.teacherId, companyId);

  const initialStatus = data.submitForReview ? "SUBMITTED" : "DRAFT";
  const assignedReviewerId = resolvedTeacherId || (user.role === "EXECUTIVE" ? user.id : null);

  const proposal = await prisma.proposal.create({
    data: {
      ...normalizeDatesAndNumbers(data),
      companyId,
      createdById: user.id,
      teacherId: resolvedTeacherId,
      reviewerId: assignedReviewerId,
      mediaUrl: mediaUrl || null,
      status: initialStatus,
    },
  });

  // Notify assigned mentor reviewer if submitted
  if (data.submitForReview && assignedReviewerId) {
    await prisma.notification.create({
      data: {
        userId: assignedReviewerId,
        type: "REVIEW_REQUESTED",
        title: `Proposal Assigned for Review: "${proposal.title}"`,
        message: `You are assigned as the mentor/reviewer for event proposal "${proposal.title}". Please review and approve.`,
        link: `/propose/${proposal.id}`,
      },
    });
  }

  if (data.submitForReview && user.isSystemAdmin !== true) {
    import("@/lib/realtime").then(({ broadcastTaskEvent }) => {
      broadcastTaskEvent({
        type: "PROPOSAL_APPROVAL_REQUESTED",
        taskId: proposal.id, // Reusing taskId field for proposal id
        userId: user.id,
        role: user.role,
        task: {
          title: proposal.title,
          createdBy: user.name,
          createdAt: proposal.createdAt.toISOString(),
        } as Record<string, unknown>,
      });
    });
  }

  await logActivity({
    userId: user.id,
    companyId,
    action: "CREATE",
    entityType: "Proposal",
    entityId: proposal.id,
    entityName: proposal.title,
    details: { type: proposal.type, status: proposal.status, assignedMentorId: assignedReviewerId },
  });

  revalidatePath("/propose");
  revalidatePath("/calendar");
  revalidatePath("/reviews");
  return { id: proposal.id, status: proposal.status };
}

export async function updateProposal(id: string, formData: FormData) {
  const user = await requirePermission("proposal:update");
  const current = await getProposalOrThrow(id);
  await assertCompanyAccess(user, current.companyId);

  // If student, can only edit their own proposals in DRAFT or REWORK
  if (user.role === "INTERN" && current.createdById !== user.id) {
    throw new Error("You can only edit your own proposals.");
  }
  if (user.role === "INTERN" && current.status !== "DRAFT" && current.status !== "REWORK") {
    throw new Error("Cannot edit proposal while it is submitted or approved.");
  }

  const data = parsePayload(formData);
  const mediaUrl = await saveMedia(formData);

  const targetCompanyId = data.companyName || data.companyId
    ? await resolveCompanyIdFromInput(user, data.companyName, data.companyId)
    : current.companyId;

  const resolvedTeacherId = await resolveTeacherOrMentor(
    data.teacherName,
    data.teacherId,
    targetCompanyId
  );

  const statusUpdate =
    data.submitForReview && (current.status === "DRAFT" || current.status === "REWORK")
      ? "SUBMITTED"
      : current.status;

  const assignedReviewerId =
    resolvedTeacherId || current.reviewerId || (user.role === "EXECUTIVE" ? user.id : null);

  const updated = await prisma.proposal.update({
    where: { id },
    data: {
      ...normalizeDatesAndNumbers(data),
      companyId: targetCompanyId,
      teacherId: resolvedTeacherId || current.teacherId,
      reviewerId: assignedReviewerId,
      ...(mediaUrl ? { mediaUrl } : {}),
      status: statusUpdate,
    },
  });

  if (data.submitForReview && assignedReviewerId) {
    await prisma.notification.create({
      data: {
        userId: assignedReviewerId,
        type: "REVIEW_REQUESTED",
        title: `Proposal Assigned for Review: "${updated.title}"`,
        message: `You are assigned as the mentor/reviewer for event proposal "${updated.title}". Please review and approve.`,
        link: `/propose/${updated.id}`,
      },
    });
  }

  if (data.submitForReview && user.isSystemAdmin !== true) {
    import("@/lib/realtime").then(({ broadcastTaskEvent }) => {
      broadcastTaskEvent({
        type: "PROPOSAL_APPROVAL_REQUESTED",
        taskId: updated.id,
        userId: user.id,
        role: user.role,
        task: {
          title: updated.title,
          createdBy: user.name,
          createdAt: updated.createdAt.toISOString(),
        } as Record<string, unknown>,
      });
    });
  }

  await logActivity({
    userId: user.id,
    companyId: current.companyId,
    action: "UPDATE",
    entityType: "Proposal",
    entityId: updated.id,
    entityName: updated.title,
  });

  revalidatePath(`/propose/${id}`);
  revalidatePath("/propose");
  revalidatePath("/calendar");
  revalidatePath("/reviews");
  return { id: updated.id, status: updated.status };
}

export async function deleteProposal(id: string) {
  const user = await requirePermission("proposal:delete");
  const current = await getProposalOrThrow(id);
  await assertCompanyAccess(user, current.companyId);

  await prisma.proposal.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    userId: user.id,
    companyId: current.companyId,
    action: "DELETE",
    entityType: "Proposal",
    entityId: id,
    entityName: current.title,
  });

  revalidatePath("/propose");
  revalidatePath("/calendar");
  revalidatePath("/reviews");
  redirect("/propose");
}

export async function submitProposalForReview(id: string) {
  const user = await requireUser();
  const current = await getProposalOrThrow(id);
  await assertCompanyAccess(user, current.companyId);

  if (current.status !== "DRAFT" && current.status !== "REWORK") {
    throw new Error("Proposal is already submitted or decided.");
  }

  const assignedReviewerId =
    current.teacherId || current.reviewerId || (user.role === "EXECUTIVE" ? user.id : null);

  await prisma.proposal.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      reviewerId: assignedReviewerId,
    },
  });

  if (assignedReviewerId) {
    await prisma.notification.create({
      data: {
        userId: assignedReviewerId,
        type: "REVIEW_REQUESTED",
        title: `Proposal Assigned for Review: "${current.title}"`,
        message: `You are assigned as the mentor/reviewer for event proposal "${current.title}". Please review and approve.`,
        link: `/propose/${id}`,
      },
    });
  }

  await logActivity({
    userId: user.id,
    companyId: current.companyId,
    action: "SUBMIT",
    entityType: "Proposal",
    entityId: id,
    entityName: current.title,
    details: { previousStatus: current.status, assignedMentorId: assignedReviewerId },
  });

  revalidatePath(`/propose/${id}`);
  revalidatePath("/propose");
  revalidatePath("/calendar");
  revalidatePath("/reviews");
}

export async function reviewProposal(id: string, values: ProposalReviewValues) {
  const user = await requireUser();
  const current = await getProposalOrThrow(id);
  await assertCompanyAccess(user, current.companyId);

  // Mentor Review Authorization Check:
  // Authorized if Super Admin, Company Admin, or the assigned Mentor/Teacher
  const isAssignedMentor =
    (current.teacherId && current.teacherId === user.id) ||
    (current.reviewerId && current.reviewerId === user.id) ||
    (current.createdById === user.id && user.role === "EXECUTIVE");

  const isAdmin = user.isSystemAdmin === true || user.role === "SENIOR";

  if (!isAdmin && !isAssignedMentor) {
    throw new Error("Only the assigned mentor or administrator is authorized to review and approve this proposal.");
  }

  const parsed = proposalReviewSchema.parse(values);

  let newStatus: "APPROVED" | "REWORK" | "REJECTED";
  if (parsed.verdict === "APPROVED") newStatus = "APPROVED";
  else if (parsed.verdict === "REWORK") newStatus = "REWORK";
  else newStatus = "REJECTED";

  await prisma.proposal.update({
    where: { id },
    data: {
      status: newStatus,
      reviewFeedback: parsed.feedback,
      reviewRating: parsed.rating ?? null,
      reviewerId: user.id,
      reviewedAt: new Date(),
    },
  });

  // Also create a record in the main Review model for audit trail
  await prisma.review.create({
    data: {
      companyId: current.companyId,
      targetType: "PROJECT",
      targetId: id,
      reviewerId: user.id,
      revieweeId: current.createdById,
      verdict: parsed.verdict,
      rating: parsed.rating ?? null,
      feedback: parsed.feedback,
    },
  });

  // Notify creator
  await prisma.notification.create({
    data: {
      userId: current.createdById,
      type: "REVIEW_COMPLETED",
      title: `Proposal “${current.title}” was ${newStatus.toLowerCase()}`,
      message: parsed.feedback,
      link: `/propose/${id}`,
    },
  });

  await logActivity({
    userId: user.id,
    companyId: current.companyId,
    action: "REVIEW",
    entityType: "Proposal",
    entityId: id,
    entityName: current.title,
    details: { verdict: parsed.verdict, rating: parsed.rating },
  });

  revalidatePath(`/propose/${id}`);
  revalidatePath("/propose");
  revalidatePath("/calendar");
  revalidatePath("/reviews");
}

export async function convertProposalToProject(id: string, options: ProposalConvertValues) {
  const user = await requirePermission("project:create");
  const current = await getProposalOrThrow(id);
  await assertCompanyAccess(user, current.companyId);

  if (current.status !== "APPROVED" && current.status !== "SUBMITTED" && current.status !== "CONVERTED") {
    throw new Error("Only approved proposals can be converted into active projects.");
  }

  const parsed = proposalConvertSchema.parse(options);

  // 1. Create the Project
  const project = await prisma.project.create({
    data: {
      companyId: current.companyId,
      batchId: parsed.batchId || null,
      name: current.title,
      description: current.description,
      objective: current.objectives,
      deliverables: `Operational deliverables for ${current.type.toLowerCase()}: ${current.title}`,
      difficulty: parsed.difficulty,
      priority: parsed.priority,
      status: "ACTIVE",
      startDate: current.startDate,
      endDate: current.endDate,
      imageUrl: current.mediaUrl,
      createdById: user.id,
    },
  });

  // 2. Link Teacher if assigned
  if (current.teacherId) {
    await prisma.projectMentor.create({
      data: {
        projectId: project.id,
        userId: current.teacherId,
      },
    });
  }

  // 3. Link proposal to project
  await prisma.proposal.update({
    where: { id },
    data: {
      status: "CONVERTED",
      projectId: project.id,
    },
  });

  // 4. Auto-provision Kanban Tasks across the 5 Production Tracks
  if (parsed.autoCreateKanbanTasks) {
    const tasksData = [
      {
        title: `[Design] Creative assets & promotional banners for ${current.title}`,
        description: `Create high-resolution visual collateral, posters, social media banners (all aspect ratios), and web assets for ${current.type.toLowerCase()}.`,
        priority: "HIGH" as const,
        order: 1,
      },
      {
        title: `[Webpage] Landing page & event calendar integration for ${current.title}`,
        description: `Develop responsive HTML landing page, slider banners, syllabus presentation, and ensure full stability.`,
        priority: "HIGH" as const,
        order: 2,
      },
      {
        title: `[Backend] Package schedule and ticketing/pricing API for ${current.title}`,
        description: `Implement schedule configuration, participant registration capacity (${current.capacity ?? "unlimited"}), and pricing engine.`,
        priority: "MEDIUM" as const,
        order: 3,
      },
      {
        title: `[App] In-App ordering, promo discount codes & share flow for ${current.title}`,
        description: `Configure mobile application upcoming event cards, discount promo engine, and social sharing links.`,
        priority: "MEDIUM" as const,
        order: 4,
      },
      {
        title: `[Marketing] Multichannel campaign (Email, WhatsApp, Social Media) for ${current.title}`,
        description: `Deploy marketing blasts across Email, WhatsApp broadcast, Instagram, Facebook, LinkedIn, and Eventbrite.`,
        priority: "HIGH" as const,
        order: 5,
      },
      {
        title: `[Accounts] Expense ledger & sales revenue tracking for ${current.title}`,
        description: `Track participant fees, manage budget expenditures ($${current.budget ?? 0}), and calculate instructor commission.`,
        priority: "MEDIUM" as const,
        order: 6,
      },
    ];

    for (const t of tasksData) {
      await prisma.task.create({
        data: {
          companyId: current.companyId,
          projectId: project.id,
          title: t.title,
          description: t.description,
          status: "PENDING",
          priority: t.priority,
          order: t.order,
          createdById: user.id,
          deadline: current.startDate,
        },
      });
    }
  }

  await logActivity({
    userId: user.id,
    companyId: current.companyId,
    action: "STATUS_CHANGE",
    entityType: "Proposal",
    entityId: id,
    entityName: current.title,
    details: { convertedToProjectId: project.id },
  });

  revalidatePath("/propose");
  revalidatePath(`/propose/${id}`);
  revalidatePath("/calendar");
  revalidatePath("/projects");
  revalidatePath("/kanban");
  revalidatePath("/tasks");

  revalidatePath(`/kanban?project=${project.id}`);
  redirect(`/kanban?project=${project.id}`);
}

export async function quickApproveEvent(id: string) {
  const user = await requireUser();
  const isAdmin = user.hierarchyLevel === 1 || user.isSystemAdmin === true;
  if (!isAdmin) {
    throw new Error("Only the School Director / Admin can approve events.");
  }
  const current = await getProposalOrThrow(id);
  await prisma.proposal.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewerId: user.id,
      reviewedAt: new Date(),
      reviewFeedback: "Approved by Admin for Pre-Planning & Execution",
    },
  });

  revalidatePath("/events");
  revalidatePath("/propose");
  revalidatePath(`/propose/${id}`);
  return { success: true };
}
