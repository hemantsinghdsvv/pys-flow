"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Loader2,
  FileText,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { quickApproveEvent } from "@/features/propose/actions";
import { AssignTasksDialog, type StaffUser } from "@/features/events/components/assign-tasks-dialog";
import { cn } from "@/lib/utils";

export type SerializedEvent = {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduleType: string;
  locationType: string;
  locationName: string | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  pricing: number | null;
  teacherName: string;
  createdByName: string;
  createdById: string;
  description: string;
  objectives: string | null;
  targetAudience: string | null;
  reviewedAt: string | null;
  projectId: string | null;
};

const KANBAN_STAGES = [
  {
    id: "PENDING_APPROVAL",
    title: "1. Proposed & Review",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
    headerBg: "bg-amber-500/10 border-amber-400/30 text-amber-900 dark:text-amber-200",
    description: "Teacher proposals awaiting Admin review",
  },
  {
    id: "APPROVED",
    title: "2. Approved — Assign Tasks",
    badgeBg: "bg-blue-100 text-blue-800 border-blue-300",
    headerBg: "bg-blue-500/10 border-blue-400/30 text-blue-900 dark:text-blue-200",
    description: "Sanctioned by School Director — assign staff tasks",
  },
  {
    id: "PRE_PLANNING",
    title: "3. Pre-Planning & Prep",
    badgeBg: "bg-purple-100 text-purple-800 border-purple-300",
    headerBg: "bg-purple-500/10 border-purple-400/30 text-purple-900 dark:text-purple-200",
    description: "Studio room, mats, materials & schedule",
  },
  {
    id: "CONFIRMED",
    title: "4. Confirmed & Registrations",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    headerBg: "bg-emerald-500/10 border-emerald-400/30 text-emerald-900 dark:text-emerald-200",
    description: "Open for student registration & live",
  },
];

export function EventKanbanBoard({
  events: initialEvents,
  isAdmin,
  currentUserId,
  staffUsers,
}: {
  events: SerializedEvent[];
  isAdmin: boolean;
  currentUserId: string;
  staffUsers: StaffUser[];
}) {
  const [events, setEvents] = useState<SerializedEvent[]>(initialEvents);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SerializedEvent | null>(null);
  const [assignTarget, setAssignTarget] = useState<SerializedEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleQuickApprove = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setPendingId(eventId);
    startTransition(async () => {
      try {
        const result = await quickApproveEvent(eventId);
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? { ...ev, status: "APPROVED", projectId: result.projectId ?? ev.projectId }
              : ev
          )
        );
        toast.success("Event approved! Now assign tasks to the team →", {
          duration: 5000,
          action: {
            label: "Assign Tasks",
            onClick: () => {
              const ev = events.find((e) => e.id === eventId);
              if (ev) setAssignTarget({ ...ev, status: "APPROVED", projectId: result.projectId ?? ev.projectId });
            },
          },
        });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to approve event");
      } finally {
        setPendingId(null);
      }
    });
  };

  const handleOpenAssign = (e: React.MouseEvent, ev: SerializedEvent) => {
    e.stopPropagation();
    setAssignTarget(ev);
  };

  // Group events into stages
  const getStageEvents = (stageId: string) => {
    return events.filter((ev) => {
      if (stageId === "PENDING_APPROVAL") {
        return ev.status === "DRAFT" || ev.status === "SUBMITTED" || ev.status === "UNDER_REVIEW";
      }
      if (stageId === "APPROVED") {
        return ev.status === "APPROVED";
      }
      if (stageId === "PRE_PLANNING") {
        return ev.status === "REWORK";
      }
      if (stageId === "CONFIRMED") {
        return ev.status === "CONVERTED";
      }
      return false;
    });
  };

  return (
    <>
      <div className="flex h-[calc(100vh-14rem)] w-full gap-4 overflow-x-auto overflow-y-hidden pb-4">
        {KANBAN_STAGES.map((stage) => {
          const stageEvents = getStageEvents(stage.id);

          return (
            <div
              key={stage.id}
              className="flex min-w-[280px] max-w-[340px] flex-1 flex-col rounded-xl border border-border bg-slate-50/60 dark:bg-slate-900/40 h-full max-h-full"
            >
              {/* Stage Header */}
              <div className={cn("p-3.5 border-b rounded-t-xl shrink-0", stage.headerBg)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm leading-tight">{stage.title}</h3>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stageEvents.length}
                  </Badge>
                </div>
                <p className="text-[11px] opacity-75 mt-0.5 leading-snug">{stage.description}</p>
              </div>

              {/* Stage Event Cards */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[700px]">
                {stageEvents.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-lg p-4">
                    No events in this stage
                  </div>
                ) : (
                  stageEvents.map((ev) => {
                    const isApproving = pendingId === ev.id;
                    const isPendingApproval =
                      ev.status === "DRAFT" || ev.status === "SUBMITTED" || ev.status === "UNDER_REVIEW";
                    const isApproved = ev.status === "APPROVED";

                    return (
                      <Card
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="cursor-pointer border border-border/80 hover:border-[#00381F]/40 hover:shadow-md transition-all bg-card rounded-xl group relative overflow-hidden"
                      >
                        {/* Type Banner */}
                        <div className="h-1 bg-gradient-to-r from-[#00381F] to-[#D9AE29]" />

                        <CardContent className="p-3.5 space-y-2.5">
                          <div className="flex items-start justify-between gap-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800"
                            >
                              {ev.type}
                            </Badge>

                            {ev.pricing != null && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {ev.pricing === 0 ? "Free" : `₹${ev.pricing}`}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight group-hover:text-[#00381F] transition-colors">
                              {ev.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {ev.description}
                            </p>
                          </div>

                          {/* Event Metadata Badges */}
                          <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/60">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-medium text-foreground">Teacher:</span>
                              <span className="text-[#944426] font-medium">{ev.teacherName}</span>
                            </div>

                            {ev.startDate && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="size-3 text-slate-400" />
                                <span>{format(new Date(ev.startDate), "EEE, d MMM yyyy")}</span>
                              </div>
                            )}

                            {ev.locationName && (
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="size-3 text-slate-400" />
                                <span>{ev.locationName}</span>
                              </div>
                            )}

                            {ev.capacity && (
                              <div className="flex items-center gap-1.5">
                                <Users className="size-3 text-slate-400" />
                                <span>Max {ev.capacity} Attendees</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Admin Approval Button */}
                          {isAdmin && isPendingApproval && (
                            <div className="pt-2 space-y-1.5">
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickApprove(e, ev.id)}
                                disabled={isApproving}
                                className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              >
                                {isApproving ? (
                                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <CheckCircle className="size-3.5 mr-1.5" />
                                )}
                                Approve Event (Admin)
                              </Button>
                            </div>
                          )}

                          {/* Assign Tasks Button — shown for APPROVED events */}
                          {isAdmin && isApproved && ev.projectId && (
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={(e) => handleOpenAssign(e, ev)}
                                className="w-full h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5"
                              >
                                <ClipboardList className="size-3.5" />
                                Assign Tasks to Team →
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                            <span>By: {ev.createdByName}</span>
                            <span className="flex items-center gap-1 text-[#00381F] font-medium">
                              Details <ArrowRight className="size-3" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Event Details Modal ── */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#00381F] text-[#F5EFE5] text-[10px] font-semibold uppercase">
                  {selectedEvent.type}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Status: {selectedEvent.status}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold font-serif text-foreground">
                {selectedEvent.title}
              </DialogTitle>
              <DialogDescription>
                Event specification, schedule, and attendee registration fields.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-3">
              {/* Key Event Information */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">Lead Teacher</span>
                  <span className="font-semibold text-foreground text-sm">{selectedEvent.teacherName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Schedule</span>
                  <span className="font-semibold text-foreground">
                    {selectedEvent.startDate ? format(new Date(selectedEvent.startDate), "PPP") : "TBA"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Studio / Location</span>
                  <span className="font-semibold text-foreground">
                    {selectedEvent.locationName || "Central Studio, Room 1"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Capacity</span>
                  <span className="font-semibold text-foreground">
                    {selectedEvent.capacity ? `${selectedEvent.capacity} spots` : "Open capacity"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Fee / Pricing</span>
                  <span className="font-semibold text-emerald-600 text-sm">
                    {selectedEvent.pricing ? `₹${selectedEvent.pricing}` : "Complimentary"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Proposer</span>
                  <span className="font-semibold text-foreground">{selectedEvent.createdByName}</span>
                </div>
              </div>

              {/* Description & Objectives */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Event Overview</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>

                {selectedEvent.objectives && (
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">Objectives & Curriculum</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {selectedEvent.objectives}
                    </p>
                  </div>
                )}
              </div>

              {/* Approved — Task Assignment Prompt */}
              {isAdmin && selectedEvent.status === "APPROVED" && selectedEvent.projectId && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/30 dark:bg-blue-950/20 p-4 flex items-start gap-3">
                  <ClipboardList className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
                      Ready to Assign Tasks
                    </p>
                    <p className="text-xs text-blue-800/80 dark:text-blue-300/80">
                      This event is approved. Assign each task to the right staff member — they'll be notified immediately.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEvent(null);
                        setAssignTarget(selectedEvent);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
                    >
                      <ClipboardList className="size-4" />
                      Assign Tasks to Team
                    </Button>
                  </div>
                </div>
              )}

              {/* Event Registration Fields Section */}
              <div className="border border-border rounded-xl p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm font-serif text-foreground flex items-center gap-2">
                    <FileText className="size-4 text-[#D9AE29]" />
                    Event Registration & Attendee Fields
                  </h4>
                  <Badge variant="secondary" className="text-[10px]">
                    Registration Ready
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  The following fields will be captured from students when booking this workshop:
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Student Full Name", tag: "Required", color: "text-emerald-600" },
                    { label: "Phone / WhatsApp Number", tag: "Required", color: "text-emerald-600" },
                    { label: "Email Address", tag: "Required", color: "text-emerald-600" },
                    { label: "Yoga Experience Level", tag: "Beginner / Int / Adv", color: "text-indigo-600" },
                    { label: "Medical / Injury Notes", tag: "Optional", color: "text-slate-500" },
                    { label: "Payment Verification", tag: "Auto-Receipt", color: "text-emerald-600" },
                  ].map((f) => (
                    <div key={f.label} className="p-2 rounded bg-muted/60 flex items-center justify-between">
                      <span className="font-medium">{f.label}</span>
                      <span className={`text-[10px] font-semibold ${f.color}`}>{f.tag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/propose/${selectedEvent.id}`}>
                      Full Proposal Page
                    </Link>
                  </Button>

                  {isAdmin && (selectedEvent.status === "DRAFT" || selectedEvent.status === "SUBMITTED" || selectedEvent.status === "UNDER_REVIEW") && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        handleQuickApprove(e, selectedEvent.id);
                        setSelectedEvent((prev) => prev ? { ...prev, status: "APPROVED" } : null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="size-4 mr-1.5" />
                      Approve Event
                    </Button>
                  )}

                  {isAdmin && selectedEvent.status === "APPROVED" && selectedEvent.projectId && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedEvent(null);
                        setAssignTarget(selectedEvent);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                      <CheckCircle2 className="size-4" />
                      Assign Tasks
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Manual Task Assignment Modal ── */}
      {assignTarget && assignTarget.projectId && (
        <AssignTasksDialog
          open={!!assignTarget}
          onClose={() => {
            setAssignTarget(null);
            // Optimistically move to CONVERTED after assignment
            setEvents((prev) =>
              prev.map((ev) =>
                ev.id === assignTarget.id ? { ...ev, status: "CONVERTED" } : ev
              )
            );
          }}
          proposalId={assignTarget.id}
          projectId={assignTarget.projectId}
          eventTitle={assignTarget.title}
          staffUsers={staffUsers}
        />
      )}
    </>
  );
}
