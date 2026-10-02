"use client";

import { useMemo, useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { taskSchema, type TaskValues } from "@/features/tasks/schemas";
import { createTask, updateTask } from "@/features/tasks/actions";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/config/labels";
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

import { MultiSelect } from "@/components/shared/multi-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";



export type ProjectOptions = {
  id: string;
  name: string;
  students: { id: string; name: string; designation?: string | null }[];
  milestones: { id: string; title: string }[];
  tasks: { id: string; title: string }[];
};

export type TaskUserItem = {
  id: string;
  name: string;
  email?: string;
  roleId?: string | null;
  orgRoleName?: string | null;
  designation?: string | null;
  hierarchyLevel?: number | null;
  departmentId?: string | null;
  departmentName?: string | null;
};

export type CurrentUserProp = {
  id: string;
  role?: string;
  roleId?: string | null;
  isSystemAdmin: boolean;
  designation?: string | null;
  hierarchyLevel?: number | null;
  departmentId?: string | null;
  departmentName?: string | null;
};

export function TaskForm({
  projects,
  initial,
  taskId,
  parentId,
  onDone,
  currentUser,
  allUsers,
}: {
  projects: ProjectOptions[];
  initial?: TaskValues;
  taskId?: string;
  parentId?: string;
  onDone?: () => void;
  currentUser?: CurrentUserProp;
  allUsers?: TaskUserItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<TaskValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(taskSchema) as any,
    defaultValues: initial ?? {
      title: "",
      description: "",
      projectId: "",
      parentId: parentId ?? "",
      milestoneId: "",
      assigneeId: "",
      status: "PENDING",
      priority: "MEDIUM",
      estimatedHours: null,
      startDate: "",
      deadline: "",
      reportingToId: "",

      dependencyIds: [],
    },
  });

  const projectId = form.watch("projectId");
  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const assignableUsers = useMemo(() => {
    if (!allUsers) return [];
    if (!currentUser) return allUsers;
    
    const currLevel = currentUser.hierarchyLevel || 4;
    const isAdmin =
      currentUser.isSystemAdmin ||
      currLevel === 1 ||
      currentUser.role === "Admin" ||
      (!currentUser.departmentId && currLevel === 1);

    return allUsers.filter(u => {
      // Cannot assign to self
      if (u.id === currentUser.id) return false;

      // Admin has full authority: can assign to any head/manager or any staff member across school
      if (isAdmin) return true;

      // Team Lead / Manager (e.g. Finance, Teacher, Schedule manager, Front desk):
      // Can ONLY assign to staff members within their own department/team!
      if (currentUser.departmentId) {
        if (u.departmentId !== currentUser.departmentId) {
          return false;
        }
      } else {
        return false;
      }

      // Hierarchy: team lead can assign to peers or subordinates (level >= current level)
      const uLevel = u.hierarchyLevel || 4;
      return currLevel <= uLevel;
    });
  }, [currentUser, allUsers]);

  const reportingUsers = useMemo(() => {
    if (!allUsers) return [];
    if (!currentUser) return allUsers;

    const currLevel = currentUser.hierarchyLevel || 4;
    const isAdmin =
      currentUser.isSystemAdmin ||
      currLevel === 1 ||
      currentUser.role === "Admin";

    return allUsers.filter(u => {
      if (u.id === currentUser.id) return false;
      if (isAdmin) return true;

      // Reporting lead must be either School Admin/Director or Department Lead in the same department
      const uLevel = u.hierarchyLevel || 4;
      const isDirector = uLevel === 1 || u.orgRoleName === "Admin";
      const isSameDeptLead =
        u.departmentId === currentUser.departmentId && uLevel <= 2;

      return isDirector || isSameDeptLead;
    });
  }, [currentUser, allUsers]);

  function onSubmit(values: TaskValues) {
    startTransition(async () => {
      try {
        if (taskId) {
          await updateTask(taskId, values);
          toast.success("Task updated");
          onDone?.();
          router.refresh();
        } else {
          const { id } = await createTask(values);
          toast.success("Task created");
          onDone?.();
          router.push(`/tasks/${id}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (!isMounted) {
    return null; // Prevent hydration mismatch errors for Shadcn form IDs
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Implement login screen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select staff member to assign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {assignableUsers.length === 0 ? (
                        <SelectItem value="no_users" disabled>
                          No team members found in your department
                        </SelectItem>
                      ) : (
                        [
                          { level: 1, name: "Head / Director" },
                          { level: 2, name: "Team Lead / Manager" },
                          { level: 3, name: "Instructor / Staff" },
                          { level: 4, name: "Intern / Associate" },
                        ].map((lvl) => {
                          const usersInLevel = assignableUsers.filter(
                            (u) => (u.hierarchyLevel || 4) === lvl.level
                          );
                          if (usersInLevel.length === 0) return null;

                          return (
                            <SelectGroup key={lvl.level}>
                              <SelectLabel className="font-semibold text-xs text-muted-foreground uppercase tracking-wider bg-muted/60 px-2 py-1 sticky top-0">
                                {lvl.name}
                              </SelectLabel>
                              {usersInLevel.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="pl-4">
                                  {u.name}
                                  {u.designation ? ` (${u.designation})` : ""}
                                  {u.departmentName ? ` · ${u.departmentName}` : ""}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
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
              name="estimatedHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Hours</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 4.0"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeline Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeline Due Date (Deadline)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reportingToId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reporting Manager</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select manager or lead who receives updates" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Default (Task Creator)</SelectItem>
                      {reportingUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                          {u.designation ? ` (${u.designation})` : ""}
                          {u.departmentName ? ` · ${u.departmentName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {project && project.milestones.length > 0 && (
              <FormField
                control={form.control}
                name="milestoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No milestone</SelectItem>
                        {project.milestones.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {project && project.tasks.length > 0 && (
              <FormField
                control={form.control}
                name="dependencyIds"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Depends on</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={project.tasks
                          .filter((t) => t.id !== taskId)
                          .map((t) => ({ value: t.id, label: t.title }))}
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Select blocking tasks..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                      <ReactQuill
                        theme="snow"
                        value={field.value}
                        onChange={field.onChange}
                        className="min-h-[300px]"
                        modules={{
                          toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                            ['link', 'image', 'video'],
                            ['clean']
                          ]
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end justify-end md:col-span-2 space-x-4 pt-4">
              <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending}>
                Discard
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin mr-2" />}
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
