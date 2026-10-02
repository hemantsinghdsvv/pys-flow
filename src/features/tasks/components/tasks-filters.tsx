"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS_LABELS } from "@/config/labels";

export function TasksFilters({
  projects,
  project,
  status,
  showPendingOption,
}: {
  projects: { id: string; name: string }[];
  project: string;
  status: string;
  showPendingOption?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `/tasks?${qs}` : "/tasks");
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={project || "all"} onValueChange={(v) => setParam("project", v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status || "all"} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
          {showPendingOption && (
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
