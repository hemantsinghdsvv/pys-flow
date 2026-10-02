import { PrismaClient } from "@prisma/client";

// Models that support soft delete via `deletedAt`.
const SOFT_DELETE_MODELS = new Set([
  "User",
  "Company",
  "Batch",
  "StudentProfile",
  "Project",
  "Milestone",
  "Team",
  "Task",
  "TaskComment",
  "Attachment",
  "DailyLog",
  "Review",
  "Repository",
  "RepoLink",
  "Document",
]);

function buildClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          // findUnique cannot take non-unique filters; verify after fetch.
          const result = await query(args);
          if (
            result &&
            SOFT_DELETE_MODELS.has(model) &&
            (result as { deletedAt?: Date | null }).deletedAt
          ) {
            return null;
          }
          return result;
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof buildClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
