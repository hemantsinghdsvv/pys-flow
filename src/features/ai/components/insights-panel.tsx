"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Sparkles,
  AlertTriangle,
  Info,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateInsights,
  type InsightsResult,
  type Insight,
} from "@/features/ai/actions";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  ListTodo,
  CalendarClock,
  NotebookPen,
  UserX,
  ClipboardCheck,
} from "lucide-react";

const SEVERITY: Record<
  Insight["severity"],
  { icon: typeof Info; className: string }
> = {
  info: { icon: Info, className: "text-sky-600 bg-sky-500/10" },
  warning: { icon: AlertTriangle, className: "text-amber-600 bg-amber-500/10" },
  critical: { icon: ShieldAlert, className: "text-red-600 bg-red-500/10" },
};

export function InsightsPanel() {
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const res = await generateInsights();
        setResult(res);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate");
      }
    });
  }

  useEffect(() => {
    run();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={pending} onClick={run}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Regenerate
        </Button>
      </div>

      {!result && pending && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Analysing program data…
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Students"
              value={result.metrics.students}
              icon={GraduationCap}
            />
            <StatCard
              title="Open tasks"
              value={result.metrics.openTasks}
              icon={ListTodo}
            />
            <StatCard
              title="Overdue tasks"
              value={result.metrics.overdueTasks}
              icon={CalendarClock}
              accent={
                result.metrics.overdueTasks > 0
                  ? "bg-red-500/10 text-red-600"
                  : undefined
              }
            />
            <StatCard
              title="Reports (7d)"
              value={result.metrics.reportsLast7}
              icon={NotebookPen}
            />
            <StatCard
              title="Not reporting"
              value={result.metrics.atRiskStudents}
              icon={UserX}
              accent={
                result.metrics.atRiskStudents > 0
                  ? "bg-amber-500/10 text-amber-600"
                  : undefined
              }
            />
            <StatCard
              title="Awaiting review"
              value={result.metrics.pendingReviews}
              icon={ClipboardCheck}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" /> Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.narrative && (
                <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                  {result.narrative}
                </p>
              )}
              <ul className="space-y-3">
                {result.insights.map((ins, i) => {
                  const { icon: Icon, className } = SEVERITY[ins.severity];
                  return (
                    <li key={i} className="flex gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          className
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{ins.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {ins.detail}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="pt-1 text-xs text-muted-foreground">
                {result.source === "ollama"
                  ? "Narrative generated by a local model; insights derived from live data."
                  : "Rule-based insights from live data. Configure OLLAMA_URL for an AI-written narrative."}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
