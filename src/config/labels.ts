import type { CompanyStatus,
  InternshipType,
  BatchStatus,
  ProjectStatus,
  Difficulty,
  Priority,
  TaskStatus,
  TeamRole,
  DailyLogStatus,
  ReviewVerdict,
  AttendanceStatus,
  DocumentType,
  MilestoneStatus,
  RepoLinkType,
  ProposalType,
  ProposalScheduleType,
  ProposalLocationType,
  ProposalStatus } from '@prisma/client';

export const ROLE_LABELS: Record<string, string> = {
  MANAGER: "Director / Studio Head",
  SENIOR: "Supervisor / Lead Teacher",
  EXECUTIVE: "Teacher / Staff Member",
  INTERN: "Instructor / Trainee",
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const INTERNSHIP_TYPE_LABELS: Record<InternshipType, string> = {
  ONSITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  UPCOMING: "Upcoming",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  REVIEW: "Reviewed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  FULLSTACK_DEVELOPER: "Lead Yoga Teacher / Master Trainer",
  FRONTEND_DEVELOPER: "Hatha & Vinyasa Instructor",
  BACKEND_DEVELOPER: "Ashtanga Yoga Teacher",
  REACT_DEVELOPER: "Pranayama & Breathwork Guide",
  FLUTTER_DEVELOPER: "Meditation & Mindfulness Guide",
  PYTHON_DEVELOPER: "Yin & Restorative Specialist",
  ML_ENGINEER: "Yoga Anatomy & Alignment Specialist",
  AI_ENGINEER: "Sound Healing & Mantra Facilitator",
  PROMPT_ENGINEER: "Yoga Philosophy & Ethics Teacher",
  UIUX_DESIGNER: "Studio Operations & Front Desk",
  QA: "Class Quality & Safety Assessor",
  CONTENT_WRITER: "Curriculum & Workshop Coordinator",
  DOCUMENTATION: "Student Records & Certification",
  RESEARCH: "Ayurveda & Holistic Wellness Advisor",
};

export const DAILY_LOG_STATUS_LABELS: Record<DailyLogStatus, string> = {
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REWORK: "Rework",
};

export const REVIEW_VERDICT_LABELS: Record<ReviewVerdict, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REWORK: "Rework Requested",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
  HOLIDAY: "Holiday",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  OFFER_LETTER: "Offer Letter",
  NDA: "NDA",
  COMPLETION_CERTIFICATE: "Completion Certificate",
  EVALUATION_SHEET: "Evaluation Sheet",
  PROGRESS_REPORT: "Progress Report",
  PRESENTATION: "Presentation",
  RESUME: "Resume",
  OTHER: "Other",
};

export const REPO_LINK_TYPE_LABELS: Record<RepoLinkType, string> = {
  BRANCH: "Branch",
  COMMIT: "Commit",
  PULL_REQUEST: "Pull Request",
  ISSUE: "Issue",
  RELEASE: "Release",
};

export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  WORKSHOP: "Workshop",
  TRAINING: "Training",
  RETREAT: "Retreat",
  PROJECT: "Project",
  OTHER: "Other",
};

export const PROPOSAL_SCHEDULE_LABELS: Record<ProposalScheduleType, string> = {
  ONE_DAY: "One Day",
  MULTI_DAYS: "Multi Days",
};

export const PROPOSAL_LOCATION_LABELS: Record<ProposalLocationType, string> = {
  STUDIO: "Studio",
  OUTDOOR: "Outdoor",
  OVERSEAS: "Overseas",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REWORK: "Rework Requested",
  REJECTED: "Rejected",
  CONVERTED: "Converted to Project",
};

/** Tailwind classes for status-badge variants. */
export const STATUS_BADGE_STYLES: Record<string, string> = {
  // generic states
  ACTIVE:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  INACTIVE: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  ARCHIVED: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  UPCOMING: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  COMPLETED:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  PLANNING:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  ON_HOLD:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  // task statuses
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PENDING_ACCEPTANCE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  BACKLOG: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  IN_PROGRESS:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  BLOCKED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  REVIEW:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  REWORK:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  // priorities
  LOW: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  MEDIUM: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  HIGH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  // log / review / proposal statuses
  DRAFT: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  SUBMITTED: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  UNDER_REVIEW:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  APPROVED:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  CONVERTED:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  // proposal types
  WORKSHOP: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  TRAINING:
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  RETREAT:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PROJECT:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  OTHER: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  // schedule & location
  ONE_DAY: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  MULTI_DAYS:
    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  STUDIO:
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  OUTDOOR:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  OVERSEAS:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  REMOTE: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  HYBRID: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  // attendance
  PRESENT:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  ABSENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  HALF_DAY:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  LEAVE: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  HOLIDAY:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  // performance bands
  GREEN:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  YELLOW:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  RED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  // milestones / misc
  DELAYED:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

