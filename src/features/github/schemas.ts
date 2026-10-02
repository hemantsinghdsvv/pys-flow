import { z } from "zod";

export const repositorySchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  name: z.string().min(1, "Name is required").max(120),
  url: z.string().url("Enter a valid repository URL"),
  defaultBranch: z.string().max(80).optional().or(z.literal("")),
});
export type RepositoryValues = z.infer<typeof repositorySchema>;

export const repoLinkSchema = z.object({
  repositoryId: z.string().min(1),
  type: z.enum(["BRANCH", "COMMIT", "PULL_REQUEST", "ISSUE", "RELEASE"]),
  url: z.string().url("Enter a valid URL"),
  title: z.string().max(160).optional().or(z.literal("")),
});
export type RepoLinkValues = z.infer<typeof repoLinkSchema>;
