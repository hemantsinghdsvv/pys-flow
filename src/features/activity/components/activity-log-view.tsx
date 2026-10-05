"use client";

import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  Clock,
  User as UserIcon,
  CheckCircle2,
  FolderGit2,
  FileText,
  Users,
  Compass,
  GraduationCap,
  Layers,
  MapPin,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityName: string | null;
  entityId: string | null;
  details: any | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    designation?: string | null;
    orgRole?: { name: string; hierarchyLevel: number | null } | null;
  };
  company?: { id: string; name: string } | null;
}

interface ActivityLogViewProps {
  logs: ActivityItem[];
  studios: { id: string; name: string }[];
}

const ACTION_CONFIG: Record<
  string,
  { label: string; badgeClass: string; borderClass: string }
> = {
  CREATE: {
    label: "Created",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    borderClass: "border-l-emerald-500",
  },
  UPDATE: {
    label: "Updated",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    borderClass: "border-l-blue-500",
  },
  STATUS_CHANGE: {
    label: "Status Changed",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    borderClass: "border-l-indigo-500",
  },
  APPROVE: {
    label: "Approved",
    badgeClass: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    borderClass: "border-l-teal-500",
  },
  SUBMIT: {
    label: "Submitted",
    badgeClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    borderClass: "border-l-cyan-500",
  },
  ASSIGN: {
    label: "Assigned",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    borderClass: "border-l-amber-500",
  },
  REVIEW: {
    label: "Reviewed",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    borderClass: "border-l-purple-500",
  },
  COMMENT: {
    label: "Commented",
    badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    borderClass: "border-l-violet-500",
  },
  DELETE: {
    label: "Deleted",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    borderClass: "border-l-rose-500",
  },
  REJECT: {
    label: "Rejected",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800",
    borderClass: "border-l-red-500",
  },
  LOGIN: {
    label: "Logged In",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
    borderClass: "border-l-slate-400",
  },
};

function getEntityIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("proposal") || t.includes("workshop")) return <Compass className="size-3.5 text-amber-600" />;
  if (t.includes("task")) return <CheckCircle2 className="size-3.5 text-emerald-600" />;
  if (t.includes("project")) return <FolderGit2 className="size-3.5 text-blue-600" />;
  if (t.includes("batch")) return <GraduationCap className="size-3.5 text-indigo-600" />;
  if (t.includes("user") || t.includes("staff")) return <Users className="size-3.5 text-purple-600" />;
  return <FileText className="size-3.5 text-slate-600" />;
}

export function ActivityLogView({ logs, studios }: ActivityLogViewProps) {
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedStudio, setSelectedStudio] = useState("ALL");
  const [timePeriod, setTimePeriod] = useState<"ALL" | "TODAY" | "WEEK">("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Distinct entity types
  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.entityType));
    return Array.from(set).sort();
  }, [logs]);

  // Distinct action types
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  // KPIs
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = logs.filter((l) => new Date(l.createdAt) >= today).length;
    const uniqueUsers = new Set(logs.map((l) => l.user.id)).size;
    const taskActions = logs.filter((l) => l.entityType.toLowerCase().includes("task")).length;
    const proposalActions = logs.filter((l) => l.entityType.toLowerCase().includes("proposal")).length;

    return {
      total: logs.length,
      todayCount,
      uniqueUsers,
      taskActions,
      proposalActions,
    };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return logs.filter((log) => {
      // Search
      if (query) {
        const userName = log.user.name.toLowerCase();
        const userEmail = log.user.email.toLowerCase();
        const entityName = (log.entityName || "").toLowerCase();
        const entityType = log.entityType.toLowerCase();
        const action = log.action.toLowerCase();
        const detailsStr = log.details ? JSON.stringify(log.details).toLowerCase() : "";

        const matches =
          userName.includes(query) ||
          userEmail.includes(query) ||
          entityName.includes(query) ||
          entityType.includes(query) ||
          action.includes(query) ||
          detailsStr.includes(query);

        if (!matches) return false;
      }

      // Entity
      if (selectedEntity !== "ALL" && log.entityType !== selectedEntity) {
        return false;
      }

      // Action
      if (selectedAction !== "ALL" && log.action !== selectedAction) {
        return false;
      }

      // Studio
      if (selectedStudio !== "ALL") {
        if (!log.company || log.company.id !== selectedStudio) {
          return false;
        }
      }

      // Time period
      if (timePeriod === "TODAY") {
        if (new Date(log.createdAt) < today) return false;
      } else if (timePeriod === "WEEK") {
        if (new Date(log.createdAt) < oneWeekAgo) return false;
      }

      return true;
    });
  }, [logs, search, selectedEntity, selectedAction, selectedStudio, timePeriod]);

  return (
    <div className="space-y-6">
      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#00381F]/10 text-[#00381F] shrink-0">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-serif text-foreground">
              {stats.total}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Total Logged Events
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-serif text-foreground flex items-center gap-1.5">
              {stats.todayCount}
              <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Actions Recorded Today
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-serif text-foreground">
              {stats.uniqueUsers}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Active Staff Contributors
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-serif text-foreground">
              {stats.taskActions + stats.proposalActions}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Tasks & Proposal Updates
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Controls Toolbar ── */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by staff member, task, proposal, or detail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background h-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Time Period Filter */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/80 self-start md:self-auto">
            <button
              onClick={() => setTimePeriod("ALL")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                timePeriod === "ALL"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimePeriod("TODAY")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                timePeriod === "TODAY"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimePeriod("WEEK")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                timePeriod === "WEEK"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </div>

        {/* Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Entity Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Entity Type
            </label>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Entities ({logs.length})</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Action Performed
            </label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                {actionTypes.map((act) => (
                  <SelectItem key={act} value={act}>
                    {ACTION_CONFIG[act]?.label || act}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Studio Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Studio Location
            </label>
            <Select value={selectedStudio} onValueChange={setSelectedStudio}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Studios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Studios / Global</SelectItem>
                {studios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Activity Stream List ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-semibold uppercase tracking-wider font-serif">
            Activity Timeline ({filteredLogs.length} matching events)
          </span>
          {(search || selectedEntity !== "ALL" || selectedAction !== "ALL" || selectedStudio !== "ALL" || timePeriod !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedEntity("ALL");
                setSelectedAction("ALL");
                setSelectedStudio("ALL");
                setTimePeriod("ALL");
              }}
              className="text-[#00381F] font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card space-y-2">
            <div className="size-10 rounded-full bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
              <Activity className="size-5" />
            </div>
            <div className="font-bold text-sm text-foreground">No Activity Records Found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No actions match your current search or filter criteria. Try clearing filters or searching for another keyword.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const actConfig = ACTION_CONFIG[log.action] || {
                label: log.action,
                badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
                borderClass: "border-l-slate-400",
              };
              const dateObj = new Date(log.createdAt);
              const isExpanded = expandedIds.has(log.id);

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border border-border bg-card shadow-2xs hover:border-[#00381F]/30 transition duration-150 border-l-4 ${actConfig.borderClass} space-y-2`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* User & Action Header */}
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7 border border-border/80">
                        {log.user.image && <AvatarImage src={log.user.image} alt={log.user.name} />}
                        <AvatarFallback className="text-[11px] font-bold bg-[#00381F]/10 text-[#00381F]">
                          {log.user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-foreground">{log.user.name}</span>
                        {log.user.designation && (
                          <span className="text-[11px] text-muted-foreground">
                            ({log.user.designation})
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-semibold uppercase tracking-wider ${actConfig.badgeClass}`}
                        >
                          {actConfig.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Timestamp & Location */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-right shrink-0">
                      {log.company && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-medium text-[10px]">
                          <MapPin className="size-2.5 text-[#00381F]" />
                          {log.company.name}
                        </span>
                      )}
                      <span className="font-medium text-foreground">
                        {formatDistanceToNow(dateObj, { addSuffix: true })}
                      </span>
                      <span>·</span>
                      <span>{format(dateObj, "dd MMM yyyy, HH:mm")}</span>
                    </div>
                  </div>

                  {/* Entity Target Summary */}
                  <div className="pl-9.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/80 text-foreground font-semibold text-[11px]">
                      {getEntityIcon(log.entityType)}
                      {log.entityType}
                    </span>

                    {log.entityName ? (
                      <span className="font-medium text-foreground">
                        {log.entityName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Entity ID: {log.entityId || "N/A"}
                      </span>
                    )}

                    {/* Expand details button if present */}
                    {log.details && (
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00381F] hover:underline ml-auto"
                      >
                        {isExpanded ? (
                          <>
                            Hide audit payload <ChevronUp className="size-3" />
                          </>
                        ) : (
                          <>
                            View audit details <ChevronDown className="size-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded JSON details payload */}
                  {isExpanded && log.details && (
                    <div className="ml-9.5 mt-2 p-2.5 rounded-lg bg-muted/50 border border-border text-[11px] font-mono overflow-x-auto">
                      <pre className="text-xs text-foreground/90 whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
