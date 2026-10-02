import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import {
  DocumentsManager,
  type DocumentRow,
} from "@/features/documents/components/documents-manager";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireUser();
  if (!can(user, "feature:documents") && !can(user, "document:read-own")) {
    redirect("/dashboard");
  }
  const scope = await companyFilter(user);
  const canManage = can(user, "document:manage");

  const where: Prisma.DocumentWhereInput = {
    ...scope,
    deletedAt: null,
    // students only see documents that belong to them
    ...(canManage ? {} : { ownerId: user.id }),
  };

  const [documents, students, projects] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    canManage
      ? prisma.user.findMany({
          where: { isSystemAdmin: false, deletedAt: null, ...scope },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.project.findMany({
          where: { ...scope, deletedAt: null },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows: DocumentRow[] = documents.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    url: d.filePath,
    ownerName: d.owner?.name ?? null,
    projectName: d.project?.name ?? null,
    createdAt: d.createdAt.toISOString(),
    ownerId: d.ownerId,
  }));

  return (
    <>
      <PageHeader
        title="Documents"
        description={
          canManage
            ? "Offer letters, certificates, evaluations, and other files."
            : "Documents shared with you."
        }
      />
      <DocumentsManager
        documents={rows}
        students={students}
        projects={projects}
        canManage={canManage}
        currentUserId={user.id}
      />
    </>
  );
}
