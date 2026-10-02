"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  CircleDot,
  Tag,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import type { RepoLinkType } from "@prisma/client";
import {
  repositorySchema,
  repoLinkSchema,
  type RepositoryValues,
  type RepoLinkValues,
} from "@/features/github/schemas";
import {
  createRepository,
  deleteRepository,
  addRepoLink,
  deleteRepoLink,
} from "@/features/github/actions";
import { REPO_LINK_TYPE_LABELS } from "@/config/labels";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type RepoLinkView = {
  id: string;
  type: RepoLinkType;
  url: string;
  title: string | null;
  createdAt: Date;
  addedBy: { id: string; name: string; image: string | null };
};

export type RepositoryView = {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  links: RepoLinkView[];
};

const LINK_ICON: Record<RepoLinkType, typeof GitBranch> = {
  BRANCH: GitBranch,
  COMMIT: GitCommit,
  PULL_REQUEST: GitPullRequest,
  ISSUE: CircleDot,
  RELEASE: Tag,
};

function AddRepositoryDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<RepositoryValues>({
    resolver: zodResolver(repositorySchema),
    defaultValues: { projectId, name: "", url: "", defaultBranch: "main" },
  });

  function onSubmit(values: RepositoryValues) {
    startTransition(async () => {
      try {
        await createRepository(values);
        toast.success("Repository added");
        setOpen(false);
        form.reset({ projectId, name: "", url: "", defaultBranch: "main" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" /> Add repository
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add repository</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="drishti-frontend" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL *</FormLabel>
                  <FormControl>
                    <Input placeholder="https://github.com/org/repo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultBranch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default branch</FormLabel>
                  <FormControl>
                    <Input placeholder="main" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddLinkDialog({ repositoryId }: { repositoryId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<RepoLinkValues>({
    resolver: zodResolver(repoLinkSchema),
    defaultValues: { repositoryId, type: "COMMIT", url: "", title: "" },
  });

  function onSubmit(values: RepoLinkValues) {
    startTransition(async () => {
      try {
        await addRepoLink(values);
        toast.success("Link added");
        setOpen(false);
        form.reset({ repositoryId, type: "COMMIT", url: "", title: "" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Link2 className="size-4" /> Add link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add repository link</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(REPO_LINK_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL *</FormLabel>
                  <FormControl>
                    <Input placeholder="https://github.com/org/repo/commit/abc123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title / note</FormLabel>
                  <FormControl>
                    <Input placeholder="Add login endpoint" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function RepositoriesPanel({
  projectId,
  repositories,
  canManage,
  currentUserId,
}: {
  projectId: string;
  repositories: RepositoryView[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <AddRepositoryDialog projectId={projectId} />
        </div>
      )}

      {repositories.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No repositories linked"
          description="Connect the project's Git repositories and log commits, PRs, issues and releases here."
        />
      ) : (
        <div className="space-y-4">
          {repositories.map((repo) => (
            <Card key={repo.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitBranch className="size-4 shrink-0" />
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate hover:underline"
                    >
                      {repo.name}
                    </a>
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    default: {repo.defaultBranch} · {repo.links.length} link
                    {repo.links.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <AddLinkDialog repositoryId={repo.id} />
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Delete repository"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await deleteRepository(repo.id);
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Failed"
                            );
                          }
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {repo.links.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No commits or links logged yet.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {repo.links.map((link) => {
                      const Icon = LINK_ICON[link.type];
                      const canRemove =
                        canManage || link.addedBy.id === currentUserId;
                      return (
                        <li
                          key={link.id}
                          className="flex items-center gap-3 py-2"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 truncate text-sm font-medium hover:underline"
                            >
                              {link.title || REPO_LINK_TYPE_LABELS[link.type]}
                              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                            </a>
                            <p className="truncate text-xs text-muted-foreground">
                              {REPO_LINK_TYPE_LABELS[link.type]} ·{" "}
                              {format(link.createdAt, "d MMM")}
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-1.5"
                            title={link.addedBy.name}
                          >
                            <UserAvatar
                              name={link.addedBy.name}
                              image={link.addedBy.image}
                              className="size-5 text-[10px]"
                            />
                          </div>
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              aria-label="Remove link"
                              disabled={pending}
                              onClick={() =>
                                startTransition(async () => {
                                  try {
                                    await deleteRepoLink(link.id);
                                  } catch (err) {
                                    toast.error(
                                      err instanceof Error ? err.message : "Failed"
                                    );
                                  }
                                })
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
