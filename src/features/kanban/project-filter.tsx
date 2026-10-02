"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProjectFilter({
  projects,
  selected,
}: {
  projects: { id: string; name: string }[];
  selected: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("project");
    else params.set("project", value);
    router.push(`/kanban?${params.toString()}`);
  }

  return (
    <Select value={selected || "all"} onValueChange={onChange}>
      <SelectTrigger className="w-52">
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
  );
}
