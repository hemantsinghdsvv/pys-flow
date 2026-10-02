export interface CurriculumTask {
  id: string;
  weekId: string;
  text: string;
  typeId: string;
  scheduledDate: string;
  scheduledTime: string;
  marks: number | null;
  markedBy: string;
  internIds: string[];
  staffId: string;
  done: boolean;
  custom?: boolean;
}

export interface CurriculumWeek {
  id: string;
  title: string;
  focus: string;
  tasks: string[];
}

export interface CurriculumMonth {
  id: string;
  title: string;
  subtitle: string;
  weeks: CurriculumWeek[];
}

export interface InternMember {
  id: string;
  name: string;
  batch?: string;
  email?: string;
  rollNumber?: string;
}

export interface StaffChecker {
  id: string;
  name: string;
  designation?: string;
  email?: string;
}

export interface TaskTypeItem {
  id: string;
  name: string;
  color: string;
}

export interface RosterState {
  interns: InternMember[];
  staff: StaffChecker[];
  types: TaskTypeItem[];
}

export interface TaskEditData {
  text?: string;
  typeId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  marks?: number | null;
  markedBy?: string;
  internIds?: string[];
  staffId?: string;
}

export interface InternshipPlannerState {
  done: Record<string, boolean>;
  edits: Record<string, TaskEditData>;
  custom: Record<string, TaskEditData[]>;
  removed: Record<string, boolean>;
  planStart: string;
  roster: RosterState;
}

export type PlannerViewType = "planner" | "profiles" | "roster" | "intern-portal";
export type ProfileMode = "single" | "batch";
export type InternPortalGrouping = "month" | "week" | "day" | "flat";
export type InternPortalFilter = "all" | "batch" | "individual" | "pending" | "done" | "overdue";
