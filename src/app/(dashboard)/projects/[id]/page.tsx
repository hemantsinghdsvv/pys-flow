import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Pencil,
  GitBranch,
  Globe,
  GraduationCap,
  UserCog,
  Users,
  ListTodo,
  Layers,
  Plus,
} from "lucide-react";
import { requireUser, assertCompanyAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  DIFFICULTY_LABELS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/config/labels";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AssignPeopleDialog } from "@/features/projects/components/assign-people-dialog";
import { RemovePersonButton } from "@/features/projects/components/remove-person-button";
import { MilestonesPanel } from "@/features/projects/components/milestones-panel";
import { TeamsPanel } from "@/features/projects/components/teams-panel";
import { RepositoriesPanel } from "@/features/github/components/repositories-panel";
import { DeleteProjectButton } from "@/features/projects/components/delete-project-button";
import { LinkBatchDialog } from "@/features/batches/components/link-batch-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, themeColor: true } },
      batch: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
      mentors: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      students: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      milestones: { where: { deletedAt: null }, orderBy: { order: "asc" } },
      repositories: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          links: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: {
              addedBy: { select: { id: true, name: true, image: true } },
            },
          },
        },
      },
      teams: {
        where: { deletedAt: null },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
      },
      _count: { select: { tasks: { where: { deletedAt: null } } } },
    },
  });
  if (!project) notFound();
  assertCompanyAccess(user, project.companyId);

  // Students may only open projects they belong to.
  if (
    user.role === "INTERN" &&
    !project.students.some((s) => s.userId === user.id)
  ) {
    notFound();
  }

  const canManage =
    user.isSystemAdmin === true ||
    (user.role === "EXECUTIVE" &&
      project.mentors.some((m) => m.userId === user.id));

  // People and batches available to assign.
  const [availableMentors, availableStudents, availableBatches, studios] = await Promise.all([
    canManage
      ? prisma.user.findMany({
          where: {
            isActive: true,
            id: { notIn: project.mentors.map((m) => m.userId) },
            AND: [
              {
                OR: [
                  { hierarchyLevel: 2 },
                  { orgRole: { hierarchyLevel: 2 } },
                ],
              },
              ...(project.companyId
                ? [
                    {
                      OR: [
                        { companyId: project.companyId },
                        { companyId: null },
                      ],
                    },
                  ]
                : []),
            ],
          },
          include: { orgRole: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.user.findMany({
          where: {
            isActive: true,
            id: { notIn: project.students.map((s) => s.userId) },
            AND: [
              {
                OR: [
                  { hierarchyLevel: 3 },
                  { orgRole: { hierarchyLevel: 3 } },
                ],
              },
              ...(project.companyId
                ? [
                    {
                      OR: [
                        { companyId: project.companyId },
                        { companyId: null },
                      ],
                    },
                  ]
                : []),
            ],
          },
          include: { orgRole: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.batch.findMany({
      where: {
        deletedAt: null,
        ...(project.companyId ? { companyId: project.companyId } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.company.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      {project.imageUrl && (
        <div className="relative -mx-4 -mt-4 h-40 overflow-hidden md:-mx-6 md:-mt-6 md:h-48">
          <Image src={project.imageUrl} alt="" fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        </div>
      )}

      <PageHeader
        title={project.name}
        description={`${project.company.name}${project.batch ? ` · ${project.batch.name}` : ""}`}
        actions={
          canManage && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/projects/${project.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
              {user.role !== "EXECUTIVE" && (
                <DeleteProjectButton
                  projectId={project.id}
                  projectName={project.name}
                />
              )}
            </>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={project.status}
          label={PROJECT_STATUS_LABELS[project.status]}
        />
        <StatusBadge
          status={project.priority}
          label={PRIORITY_LABELS[project.priority]}
        />
        <Badge variant="outline">{DIFFICULTY_LABELS[project.difficulty]}</Badge>

        {/* Batch / Cohort Badge & Link Action */}
        {project.batch ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-md px-2.5 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <Link
              href={`/batches/${project.batch.id}`}
              className="flex items-center gap-1 hover:underline"
            >
              <Layers className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Batch: {project.batch.name}</span>
            </Link>
            {canManage && (
              <LinkBatchDialog
                projectId={project.id}
                projectName={project.name}
                currentBatchId={project.batch.id}
                batches={availableBatches}
                studios={studios}
                defaultCompanyId={project.companyId ?? undefined}
                trigger={
                  <button
                    type="button"
                    className="text-[11px] underline opacity-70 hover:opacity-100 ml-1 cursor-pointer"
                  >
                    (change)
                  </button>
                }
              />
            )}
          </div>
        ) : (
          canManage && (
            <LinkBatchDialog
              projectId={project.id}
              projectName={project.name}
              currentBatchId={null}
              batches={availableBatches}
              studios={studios}
              defaultCompanyId={project.companyId ?? undefined}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-dashed gap-1 text-[#00381F] dark:text-[#D9AE29] hover:bg-[#00381F]/5"
                >
                  <Plus className="size-3" />
                  <span>Link or Create Batch</span>
                </Button>
              }
            />
          )
        )}

        {project.startDate && project.endDate && (
          <span className="text-sm text-muted-foreground">
            {format(project.startDate, "d MMM yyyy")} –{" "}
            {format(project.endDate, "d MMM yyyy")}
          </span>
        )}
        {project.repositoryUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={project.repositoryUrl} target="_blank" rel="noreferrer">
              <GitBranch className="size-4" /> Repository
            </a>
          </Button>
        )}
        {project.deploymentUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={project.deploymentUrl} target="_blank" rel="noreferrer">
              <Globe className="size-4" /> Live
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/kanban?project=${project.id}`}>
            <ListTodo className="size-4" /> Board ({project._count.tasks})
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 font-medium">Description</p>
                  <p className="text-muted-foreground">
                    {project.description ?? "No description."}
                  </p>
                </div>
                {project.objective && (
                  <div>
                    <p className="mb-1 font-medium">Objective</p>
                    <p className="text-muted-foreground">{project.objective}</p>
                  </div>
                )}
                {project.deliverables && (
                  <div>
                    <p className="mb-1 font-medium">Expected deliverables</p>
                    <p className="whitespace-pre-line text-muted-foreground">
                      {project.deliverables}
                    </p>
                  </div>
                )}
                {project.techStack.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-medium">Technology stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {project.techStack.map((tech) => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCog className="size-4" /> Team Leads / Supervisors
                  </CardTitle>
                  {canManage && (
                    <AssignPeopleDialog
                      projectId={project.id}
                      kind="mentor"
                      options={availableMentors.map((m) => ({
                        value: m.id,
                        label: m.orgRole?.name ? `${m.name} · Level 2 (${m.orgRole.name})` : `${m.name} · Level 2`,
                      }))}
                    />
                  )}
                </CardHeader>
                <CardContent>
                  {project.mentors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No team leads or supervisors assigned.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {project.mentors.map(({ user: mentor }) => (
                        <li key={mentor.id} className="flex items-center gap-2.5">
                          <UserAvatar name={mentor.name} image={mentor.image} />
                          <span className="flex-1 truncate text-sm font-medium">
                            {mentor.name}
                          </span>
                          {canManage && (
                            <RemovePersonButton
                              projectId={project.id}
                              userId={mentor.id}
                              kind="mentor"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="size-4" /> Staff Members
                  </CardTitle>
                  {canManage && (
                    <AssignPeopleDialog
                      projectId={project.id}
                      kind="student"
                      options={availableStudents.map((s) => ({
                        value: s.id,
                        label: s.orgRole?.name ? `${s.name} · Level 3 (${s.orgRole.name})` : `${s.name} · Level 3`,
                      }))}
                    />
                  )}
                </CardHeader>
                <CardContent>
                  {project.students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No staff members assigned.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {project.students.map(({ user: student }) => (
                        <li key={student.id} className="flex items-center gap-2.5">
                          <UserAvatar name={student.name} image={student.image} />
                          <span className="flex-1 truncate text-sm font-medium">
                            {student.name}
                          </span>
                          {canManage && (
                            <RemovePersonButton
                              projectId={project.id}
                              userId={student.id}
                              kind="student"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Batch / Cohort Card */}
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="size-4" /> Batch / Cohort
                  </CardTitle>
                  {canManage && (
                    <LinkBatchDialog
                      projectId={project.id}
                      projectName={project.name}
                      currentBatchId={project.batch?.id ?? null}
                      batches={availableBatches}
                      studios={studios}
                      defaultCompanyId={project.companyId ?? undefined}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#00381F] dark:text-[#D9AE29]">
                          <Plus className="size-3" />
                          <span>{project.batch ? "Change" : "Connect"}</span>
                        </Button>
                      }
                    />
                  )}
                </CardHeader>
                <CardContent className="text-sm">
                  {project.batch ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/batches/${project.batch.id}`}
                          className="font-semibold text-foreground hover:text-[#00381F] dark:hover:text-[#D9AE29] hover:underline flex items-center gap-1.5"
                        >
                          <Layers className="size-4 text-[#00381F] dark:text-[#D9AE29]" />
                          {project.batch.name}
                        </Link>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {project.batch.status.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          Studio:{" "}
                          <span className="font-medium text-foreground">
                            {project.company.name}
                          </span>
                        </div>
                        {project.batch.startDate && project.batch.endDate && (
                          <div>
                            Duration:{" "}
                            <span className="font-medium text-foreground">
                              {format(project.batch.startDate, "d MMM yyyy")} –{" "}
                              {format(project.batch.endDate, "d MMM yyyy")}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="pt-1">
                        <Button variant="outline" size="sm" asChild className="w-full text-xs h-8">
                          <Link href={`/batches/${project.batch.id}`}>
                            View Batch Cohort Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>No cohort or trainee batch is linked to this initiative.</p>
                      {canManage && (
                        <LinkBatchDialog
                          projectId={project.id}
                          projectName={project.name}
                          currentBatchId={null}
                          batches={availableBatches}
                          studios={studios}
                          defaultCompanyId={project.companyId ?? undefined}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs h-8 border-dashed gap-1 text-[#00381F] dark:text-[#D9AE29]"
                            >
                              <Plus className="size-3" />
                              <span>Link or Create Batch</span>
                            </Button>
                          }
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="pt-4">
          <TeamsPanel
            projectId={project.id}
            canManage={canManage}
            people={project.students.map((s) => ({
              id: s.user.id,
              name: s.user.name,
            }))}
            teams={project.teams.map((team) => ({
              id: team.id,
              name: team.name,
              description: team.description,
              members: team.members.map((m) => ({
                userId: m.user.id,
                name: m.user.name,
                image: m.user.image,
                role: m.role ?? "FULLSTACK_DEVELOPER",
                isLeader: m.isLeader,
              })),
            }))}
          />
        </TabsContent>

        <TabsContent value="milestones" className="pt-4">
          <MilestonesPanel
            projectId={project.id}
            milestones={project.milestones}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="repositories" className="pt-4">
          <RepositoriesPanel
            projectId={project.id}
            canManage={canManage}
            currentUserId={user.id}
            repositories={project.repositories.map((repo) => ({
              id: repo.id,
              name: repo.name,
              url: repo.url,
              defaultBranch: repo.defaultBranch,
              links: repo.links.map((l) => ({
                id: l.id,
                type: l.type ?? "COMMIT",
                url: l.url,
                title: l.title,
                createdAt: l.createdAt,
                addedBy: l.addedBy ?? { id: "", name: "Unknown", image: null },
              })),
            }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
