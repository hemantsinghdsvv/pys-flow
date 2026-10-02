"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, ArrowLeft, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSimpleProject } from "@/features/projects/actions";

export function YogaProjectForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "ACTIVE" as "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Please enter a project title.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createSimpleProject({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          status: formData.status,
          priority: formData.priority,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        });

        if (res.success) {
          toast.success("Project created successfully!", {
            description: `"${formData.name}" is now live in school initiatives.`,
          });
          router.push("/projects");
          router.refresh();
        }
      } catch (err: any) {
        console.error("Failed to create project:", err);
        setError(err.message || "Could not create project. Please verify inputs.");
      }
    });
  };

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="border-b border-border/80 pb-4">
        <CardTitle className="font-serif text-lg font-bold text-foreground">
          Project Scope & Timelines
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Enter the core information for this initiative. You can link tasks and team members immediately after creation.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Title */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="text-xs font-semibold text-foreground">
              Initiative / Program Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="e.g., 200-Hour Yoga Teacher Training (TTC), Annual Retreat..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 text-sm focus-visible:ring-[#00381F]"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="project-desc" className="text-xs font-semibold text-foreground">
              Description & Objectives
            </Label>
            <Textarea
              id="project-desc"
              rows={4}
              placeholder="Describe the operational goals, target participants, curriculum modules, or studio requirements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-sm resize-none focus-visible:ring-[#00381F]"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Initial Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-10 text-xs w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">Planning / In Preparation</SelectItem>
                  <SelectItem value="ACTIVE">Active / Currently Running</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Priority Level</Label>
              <Select
                value={formData.priority}
                onValueChange={(val: any) => setFormData({ ...formData, priority: val })}
              >
                <SelectTrigger className="h-10 text-xs w-full">
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent / Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-start" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                Start Date
              </Label>
              <Input
                id="project-start"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-10 text-xs focus-visible:ring-[#00381F]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-end" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                Target Completion Date
              </Label>
              <Input
                id="project-end"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="h-10 text-xs focus-visible:ring-[#00381F]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild className="text-xs h-9">
              <Link href="/projects" className="gap-1.5">
                <ArrowLeft className="size-3.5" />
                Cancel & Return
              </Link>
            </Button>

            <Button
              type="submit"
              disabled={pending}
              className="bg-[#00381F] hover:bg-[#0A4A2B] text-[#F5EFE5] text-xs h-9 min-w-[130px]"
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Plus className="size-3.5 mr-1.5" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
