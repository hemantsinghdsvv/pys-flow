import "server-only";
import type { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogActivityInput = {
  userId: string;
  companyId?: string | null;
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Prisma.InputJsonValue;
};

/** Fire-and-forget audit log writer. Never throws into the caller. */
export async function logActivity(input: LogActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: input.userId,
        companyId: input.companyId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        details: input.details,
      },
    });
  } catch (err) {
    console.error("logActivity failed", err);
  }
}
