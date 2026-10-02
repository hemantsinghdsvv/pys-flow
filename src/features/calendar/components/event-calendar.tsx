"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  differenceInDays,
  isAfter,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  MapPin,
  Clock,
  Users,
  DollarSign,
  User as UserIcon,
  Compass,
  ArrowRight,
  Search,
  Sparkles,
  CalendarDays,
  KanbanSquare,
  Zap,
  Plus,
  ExternalLink,
  CalendarRange,
  RefreshCw,
} from "lucide-react";
import type { ProposalType, ProposalStatus, ProposalLocationType } from "@prisma/client";
import {
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_LOCATION_LABELS,
} from "@/config/labels";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type CalendarEventItem = {
  id: string;
  title: string;
  type: ProposalType;
  scheduleType: string;
  locationType: ProposalLocationType;
  locationName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dailyHours?: number | null;
  totalHours?: number | null;
  capacity?: number | null;
  teacherName?: string | null;
  pricing?: number | null;
  budget?: number | null;
  description: string;
  objectives?: string | null;
  targetAudience?: string | null;
  status: ProposalStatus;
  companyName?: string | null;
  projectId?: string | null;
};

const TYPE_CONFIG: Record<
  ProposalType,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    gradient: string;
    icon: string;
  }
> = {
  WORKSHOP: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    dot: "bg-emerald-500",
    gradient: "from-emerald-500/20 to-teal-500/10",
    icon: "🎓",
  },
  TRAINING: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500/30 hover:border-sky-500/60",
    dot: "bg-sky-500",
    gradient: "from-sky-500/20 to-blue-500/10",
    icon: "🚀",
  },
  RETREAT: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30 hover:border-purple-500/60",
    dot: "bg-purple-500",
    gradient: "from-purple-500/20 to-fuchsia-500/10",
    icon: "🏕️",
  },
  PROJECT: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30 hover:border-amber-500/60",
    dot: "bg-amber-500",
    gradient: "from-amber-500/20 to-orange-500/10",
    icon: "📁",
  },
  OTHER: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/30 hover:border-slate-500/60",
    dot: "bg-slate-500",
    gradient: "from-slate-500/20 to-zinc-500/10",
    icon: "🔖",
  },
};

export function EventCalendar({ events }: { events: CalendarEventItem[] }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  // Real-time live synchronization (Auto-poll every 12s & on tab focus)
  useEffect(() => {
    const handleFocus = () => {
      router.refresh();
      setLastSynced(new Date());
    };

    window.addEventListener("focus", handleFocus);
    const interval = setInterval(() => {
      router.refresh();
      setLastSynced(new Date());
    }, 12000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [router]);

  const handleManualSync = () => {
    setIsRefreshing(true);
    router.refresh();
    setLastSynced(new Date());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Intelligent Metrics Calculation
  const metrics = useMemo(() => {
    const total = events.length;
    const workshops = events.filter((e) => e.type === "WORKSHOP").length;
    const trainings = events.filter((e) => e.type === "TRAINING").length;
    const retreats = events.filter((e) => e.type === "RETREAT").length;
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const totalPipelineRevenue = events.reduce(
      (sum, e) => sum + ((e.pricing || 0) * (e.capacity || 1)),
      0
    );
    const upcoming = events.filter((e) => e.startDate && isAfter(new Date(e.startDate), new Date())).length;

    return { total, workshops, trainings, retreats, totalCapacity, totalPipelineRevenue, upcoming };
  }, [events]);

  // Smart Find Next Event
  const nextEvent = useMemo(() => {
    const upcomingEvents = events
      .filter((e) => e.startDate && isAfter(new Date(e.startDate), new Date()))
      .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
    return upcomingEvents[0] || null;
  }, [events]);

  // Function to smart-jump to the next event's month
  function jumpToNextEvent() {
    if (nextEvent?.startDate) {
      setCurrentDate(new Date(nextEvent.startDate));
      setSelectedEvent(nextEvent);
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesTeacher = e.teacherName?.toLowerCase().includes(q);
        const matchesLocation = e.locationName?.toLowerCase().includes(q);
        const matchesCompany = e.companyName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTeacher && !matchesLocation && !matchesCompany) return false;
      }
      return true;
    });
  }, [events, typeFilter, statusFilter, searchQuery]);

  // Month grid dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Week grid dates
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function getEventsForDay(day: Date) {
    return filteredEvents.filter((e) => {
      if (!e.startDate) return false;
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : start;
      const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const en = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return d >= s && d <= en;
    });
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {/* Intelligent Stats & Intelligence Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Events</p>
              <CalendarDays className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{metrics.total}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-primary">{metrics.upcoming}</span> upcoming
            </div>
          </Card>

          <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background to-background p-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Workshops</p>
              <span className="text-sm">🎓</span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {metrics.workshops}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Short & Multi-day</p>
          </Card>

          <Card className="relative overflow-hidden border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-background to-background p-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Trainings & Retreats</p>
              <span className="text-sm">🚀</span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
              {metrics.trainings + metrics.retreats}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Immersion Programs</p>
          </Card>

          <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-background to-background p-4 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Target Capacity</p>
              <Users className="size-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {metrics.totalCapacity}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Seats across events</p>
          </Card>

          <Card className="col-span-2 relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-background p-4 shadow-sm transition-all duration-300 hover:shadow-md sm:col-span-4 lg:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Revenue Projection</p>
              <DollarSign className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              ${metrics.totalPipelineRevenue.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Full potential value</p>
          </Card>
        </div>

        {/* Calendar Control & Smart Filter Toolbar */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Month/Week Navigation */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <CalendarRange className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {format(currentDate, viewMode === "week" ? "'Week of' MMM d, yyyy" : "MMMM yyyy")}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredEvents.length} {filteredEvents.length === 1 ? "event scheduled" : "events scheduled"}
                  </p>
                </div>
              </div>

              <div className="flex items-center rounded-lg border bg-muted/40 p-1 shadow-inner">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-md transition hover:bg-background hover:shadow-sm"
                  onClick={() =>
                    setCurrentDate(
                      viewMode === "week"
                        ? subWeeks(currentDate, 1)
                        : subMonths(currentDate, 1)
                    )
                  }
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold transition hover:bg-background hover:shadow-sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-md transition hover:bg-background hover:shadow-sm"
                  onClick={() =>
                    setCurrentDate(
                      viewMode === "week"
                        ? addWeeks(currentDate, 1)
                        : addMonths(currentDate, 1)
                    )
                  }
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {nextEvent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={jumpToNextEvent}
                  className="hidden h-8 items-center gap-1.5 border-primary/30 bg-primary/5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground md:inline-flex"
                >
                  <Zap className="size-3.5 fill-primary" />
                  Jump to Next Event ({format(new Date(nextEvent.startDate!), "MMM yyyy")})
                </Button>
              )}

              {/* Real-Time Live Status Badge */}
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">Live Real-Time</span>
                <button
                  type="button"
                  onClick={handleManualSync}
                  className="ml-1 rounded p-0.5 text-muted-foreground transition hover:bg-emerald-500/20 hover:text-foreground"
                  title={`Live synced at ${lastSynced.toLocaleTimeString()} - Click to sync now`}
                >
                  <RefreshCw className={`size-3 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Smart Search & Filter Dropdowns & View Switches */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[170px] flex-1 sm:w-52 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search title, teacher, venue…"
                  className="h-9 rounded-lg pl-8 text-xs focus-visible:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-32 rounded-lg text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {Object.entries(PROPOSAL_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {TYPE_CONFIG[k as ProposalType]?.icon} {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-32 rounded-lg text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="SUBMITTED">In Review</SelectItem>
                  <SelectItem value="CONVERTED">In Kanban</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>

              {/* View Switcher Tabs */}
              <div className="flex items-center rounded-lg border bg-muted/40 p-1 shadow-inner">
                <Button
                  variant={viewMode === "month" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs font-semibold"
                  onClick={() => setViewMode("month")}
                >
                  <CalendarIcon className="mr-1 size-3.5" /> Month
                </Button>
                <Button
                  variant={viewMode === "week" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs font-semibold"
                  onClick={() => setViewMode("week")}
                >
                  <CalendarRange className="mr-1 size-3.5" /> Week
                </Button>
                <Button
                  variant={viewMode === "agenda" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs font-semibold"
                  onClick={() => setViewMode("agenda")}
                >
                  <List className="mr-1 size-3.5" /> Agenda
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 1. MONTH GRID VIEW */}
        {viewMode === "month" && (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md transition-all duration-300">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b bg-muted/60 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                (day) => (
                  <div key={day} className="py-3">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                  </div>
                )
              )}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border/60 text-xs">
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentToday = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`group relative min-h-[125px] p-2 transition-all duration-200 hover:bg-accent/40 ${
                      isCurrentMonth ? "bg-card" : "bg-muted/15 text-muted-foreground/40"
                    } ${isCurrentToday ? "bg-primary/[0.04] ring-1 ring-inset ring-primary/30" : ""}`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-transform duration-200 group-hover:scale-110 ${
                          isCurrentToday
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/40 font-bold"
                            : isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {/* Quick Add Proposal Hover Action */}
                      <Link
                        href={`/propose/new?date=${format(day, "yyyy-MM-dd")}`}
                        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        title="Propose event on this date"
                      >
                        <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground">
                          <Plus className="size-3" />
                        </div>
                      </Link>
                    </div>

                    {/* Events List on Day */}
                    <div className="mt-2 space-y-1.5">
                      {dayEvents.slice(0, 3).map((e) => {
                        const config = TYPE_CONFIG[e.type] || TYPE_CONFIG.OTHER;
                        const isHovered = hoveredEventId === e.id;

                        return (
                          <Tooltip key={e.id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setSelectedEvent(e)}
                                onMouseEnter={() => setHoveredEventId(e.id)}
                                onMouseLeave={() => setHoveredEventId(null)}
                                className={`w-full rounded-lg border px-2 py-1 text-left text-[11px] font-semibold transition-all duration-200 ${
                                  config.bg
                                } ${config.text} ${config.border} ${
                                  isHovered
                                    ? "scale-[1.03] shadow-md ring-1 ring-primary/50"
                                    : "hover:scale-[1.02] hover:shadow-sm"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span>{config.icon}</span>
                                  <span className="truncate">{e.title}</span>
                                </div>
                                {e.pricing && e.pricing > 0 && (
                                  <div className="mt-0.5 flex items-center justify-between text-[10px] opacity-80">
                                    <span>${e.pricing}</span>
                                    {e.capacity && <span>{e.capacity} seats</span>}
                                  </div>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs p-3 text-xs shadow-xl">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span>{config.icon}</span>
                                  <span className="font-bold">{e.title}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                  {e.teacherName && (
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="size-3" /> {e.teacherName}
                                    </span>
                                  )}
                                  {e.locationName && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="size-3" /> {e.locationName}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between border-t pt-1.5 text-[11px]">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {e.pricing && e.pricing > 0 ? `$${e.pricing}` : "Free"}
                                  </span>
                                  <span className="text-muted-foreground">Click to inspect</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setViewMode("agenda")}
                          className="w-full text-center text-[10px] font-bold text-primary transition hover:underline"
                        >
                          +{dayEvents.length - 3} more events
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEK TIMELINE VIEW */}
        {viewMode === "week" && (
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md">
            <div className="grid grid-cols-7 divide-x border-b bg-muted/60 text-center text-xs font-bold text-muted-foreground">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="p-3">
                  <p className="uppercase tracking-wider">{format(day, "EEE")}</p>
                  <p
                    className={`mt-1 text-base font-bold ${
                      isToday(day) ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {format(day, "d MMM")}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-border/60 p-2">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div key={day.toISOString()} className="min-h-[300px] space-y-2 p-1.5">
                    {dayEvents.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center text-[11px] text-muted-foreground/40">
                        No events
                      </div>
                    ) : (
                      dayEvents.map((e) => {
                        const config = TYPE_CONFIG[e.type] || TYPE_CONFIG.OTHER;
                        return (
                          <div
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className={`group cursor-pointer rounded-xl border p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${config.bg} ${config.border}`}
                          >
                            <div className="flex items-center gap-1 text-xs font-bold">
                              <span>{config.icon}</span>
                              <span className={`truncate ${config.text}`}>{e.title}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                              {e.locationName || e.teacherName || "Scheduled session"}
                            </p>
                            <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-1.5 text-[10px]">
                              <span className="font-semibold text-foreground">
                                {e.pricing && e.pricing > 0 ? `$${e.pricing}` : "Free"}
                              </span>
                              <span className="text-muted-foreground">
                                {e.dailyHours ? `${e.dailyHours} hrs/day` : "All day"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. AGENDA / STREAM VIEW */}
        {viewMode === "agenda" && (
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <Card className="border-dashed py-16 text-center text-muted-foreground">
                <Compass className="mx-auto size-12 opacity-30 animate-pulse" />
                <h3 className="mt-3 text-base font-semibold">No events matching your filter</h3>
                <p className="mt-1 text-xs">Try selecting another filter or create a new proposal.</p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/propose/new">
                    <Plus className="mr-1.5 size-4" /> Propose an Event
                  </Link>
                </Button>
              </Card>
            ) : (
              filteredEvents.map((e) => {
                const config = TYPE_CONFIG[e.type] || TYPE_CONFIG.OTHER;
                const daysUntil = e.startDate
                  ? differenceInDays(new Date(e.startDate), new Date())
                  : null;

                return (
                  <Card
                    key={e.id}
                    className="group overflow-hidden border-border/70 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Event Type Accent Strip */}
                      <div
                        className={`flex w-full items-center justify-between border-b p-4 md:w-56 md:flex-col md:items-start md:justify-center md:border-b-0 md:border-r ${config.bg}`}
                      >
                        <div>
                          <span className="text-2xl">{config.icon}</span>
                          <p className={`mt-1 font-bold ${config.text}`}>
                            {PROPOSAL_TYPE_LABELS[e.type]}
                          </p>
                          <p className="text-xs text-muted-foreground">{e.companyName || "Organization"}</p>
                        </div>
                        {daysUntil !== null && (
                          <Badge variant="outline" className="mt-2 text-[10px] font-semibold">
                            {daysUntil > 0
                              ? `In ${daysUntil} days`
                              : daysUntil === 0
                              ? "Happening Today!"
                              : `${Math.abs(daysUntil)} days ago`}
                          </Badge>
                        )}
                      </div>

                      {/* Main Body */}
                      <CardContent className="flex flex-1 flex-col justify-between p-5 sm:flex-row sm:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                              {e.title}
                            </h3>
                            <StatusBadge
                              status={e.status}
                              label={PROPOSAL_STATUS_LABELS[e.status]}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                            {e.startDate && (
                              <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <CalendarIcon className="size-3.5 text-primary" />
                                {format(new Date(e.startDate), "EEE, d MMM yyyy")}
                                {e.endDate && ` → ${format(new Date(e.endDate), "d MMM yyyy")}`}
                              </span>
                            )}
                            {e.locationName && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="size-3.5 text-rose-500" />
                                {e.locationName}
                              </span>
                            )}
                            {e.teacherName && (
                              <span className="flex items-center gap-1.5">
                                <UserIcon className="size-3.5 text-sky-500" />
                                {e.teacherName}
                              </span>
                            )}
                            {e.totalHours && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="size-3.5 text-amber-500" />
                                {e.totalHours} total hours ({e.dailyHours || 4}h/day)
                              </span>
                            )}
                          </div>

                          {e.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {e.description}
                            </p>
                          )}
                        </div>

                        {/* Right Pricing & Actions */}
                        <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4 sm:mt-0 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="text-lg font-extrabold text-foreground">
                              {e.pricing && e.pricing > 0 ? `$${e.pricing}` : "Free"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {e.capacity ? `${e.capacity} seats available` : "Open entry"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedEvent(e)}
                              className="h-8 gap-1 text-xs font-semibold transition hover:border-primary"
                            >
                              Quick Details
                            </Button>
                            <Button size="sm" className="h-8 gap-1 text-xs font-semibold" asChild>
                              <Link href={`/propose/${e.id}`}>
                                Full Proposal <ArrowRight className="size-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* 4. INTERACTIVE EVENT DETAIL MODAL */}
        {selectedEvent && (
          <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
            <DialogContent className="max-w-md sm:max-w-xl overflow-hidden border-border/80 p-0 shadow-2xl">
              {/* Top Accent Gradient Header */}
              <div
                className={`bg-gradient-to-r p-6 text-foreground ${
                  TYPE_CONFIG[selectedEvent.type]?.bg || ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{TYPE_CONFIG[selectedEvent.type]?.icon}</span>
                    <Badge variant="secondary" className="font-bold">
                      {PROPOSAL_TYPE_LABELS[selectedEvent.type]}
                    </Badge>
                    <StatusBadge
                      status={selectedEvent.status}
                      label={PROPOSAL_STATUS_LABELS[selectedEvent.status]}
                    />
                  </div>
                  {selectedEvent.companyName && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {selectedEvent.companyName}
                    </span>
                  )}
                </div>
                <DialogTitle className="mt-3 text-xl font-bold tracking-tight">
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-muted-foreground">
                  Location Mode: {PROPOSAL_LOCATION_LABELS[selectedEvent.locationType]} · Format:{" "}
                  {selectedEvent.scheduleType}
                </DialogDescription>
              </div>

              {/* Body Specifications */}
              <div className="space-y-5 p-6 text-sm">
                <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-4 text-xs">
                  <div>
                    <p className="flex items-center gap-1 font-semibold text-muted-foreground">
                      <CalendarIcon className="size-3.5 text-primary" /> Dates & Schedule
                    </p>
                    <p className="mt-1 font-bold text-foreground">
                      {selectedEvent.startDate
                        ? format(new Date(selectedEvent.startDate), "d MMM yyyy")
                        : "TBD"}
                      {selectedEvent.endDate
                        ? ` - ${format(new Date(selectedEvent.endDate), "d MMM yyyy")}`
                        : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedEvent.dailyHours || 4} hours/day ({selectedEvent.totalHours || 4}h total)
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 font-semibold text-muted-foreground">
                      <MapPin className="size-3.5 text-rose-500" /> Venue & Location
                    </p>
                    <p className="mt-1 font-bold text-foreground">
                      {selectedEvent.locationName || PROPOSAL_LOCATION_LABELS[selectedEvent.locationType]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {PROPOSAL_LOCATION_LABELS[selectedEvent.locationType]}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 font-semibold text-muted-foreground">
                      <UserIcon className="size-3.5 text-sky-500" /> Lead Instructor
                    </p>
                    <p className="mt-1 font-bold text-foreground">
                      {selectedEvent.teacherName || "Assigned Mentor"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Curriculum Lead</p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 font-semibold text-muted-foreground">
                      <DollarSign className="size-3.5 text-amber-500" /> Commercials & Seats
                    </p>
                    <p className="mt-1 font-bold text-foreground">
                      {selectedEvent.pricing && selectedEvent.pricing > 0
                        ? `$${selectedEvent.pricing} / ticket`
                        : "Free of charge"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedEvent.capacity ? `${selectedEvent.capacity} target seats` : "Open"}
                    </p>
                  </div>
                </div>

                {selectedEvent.objectives && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Objectives & Target Audience
                    </h4>
                    <p className="mt-1 text-xs text-foreground">
                      {selectedEvent.objectives}
                    </p>
                    {selectedEvent.targetAudience && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        🎯 Target: {selectedEvent.targetAudience}
                      </p>
                    )}
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Scope & Details
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-4">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/propose/${selectedEvent.id}`}>
                      <ExternalLink className="mr-1.5 size-3.5" /> Full Proposal Page
                    </Link>
                  </Button>
                  {selectedEvent.projectId ? (
                    <Button size="sm" asChild className="bg-primary">
                      <Link href={`/kanban?project=${selectedEvent.projectId}`}>
                        <KanbanSquare className="mr-1.5 size-3.5" /> Open in Kanban
                      </Link>
                    </Button>
                  ) : (
                    selectedEvent.status === "APPROVED" && (
                      <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href={`/propose/${selectedEvent.id}`}>
                          <Sparkles className="mr-1.5 size-3.5" /> Convert to Kanban
                        </Link>
                      </Button>
                    )
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}
