import "server-only";
import { prisma } from "@/lib/prisma";

export async function getCompanies() {
  return prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: { where: { isSystemAdmin: false, deletedAt: null } },
          projects: { where: { deletedAt: null } },
          batches: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export async function getCompanyById(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: { where: { isSystemAdmin: false, deletedAt: null } },
          projects: { where: { deletedAt: null } },
          batches: { where: { deletedAt: null } },
          teams: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export type CompanyWithCounts = Awaited<
  ReturnType<typeof getCompanies>
>[number];
