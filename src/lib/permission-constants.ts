
export const PERMISSION_DEFINITIONS = [
  // ── 1. Feature Access ──
  {
    code: "feature:dashboard",
    category: "Feature Access",
    name: "Access Dashboard",
    description: "View main analytics and summary metrics.",
  },
  {
    code: "feature:companies",
    category: "Feature Access",
    name: "Access Companies",
    description: "View and manage company profiles.",
  },
  {
    code: "feature:batches",
    category: "Feature Access",
    name: "Access Batches",
    description: "View and manage internship batches.",
  },
  {
    code: "feature:projects",
    category: "Feature Access",
    name: "Access Projects",
    description: "View and manage projects.",
  },
  {
    code: "feature:students",
    category: "Feature Access",
    name: "Access Students",
    description: "View student directory and progress.",
  },
  {
    code: "feature:mentors",
    category: "Feature Access",
    name: "Access Mentors",
    description: "View mentors directory and assignments.",
  },
  {
    code: "feature:tasks",
    category: "Feature Access",
    name: "Access Tasks",
    description: "View task lists and task workflows.",
  },
  {
    code: "feature:propose",
    category: "Feature Access",
    name: "Access Proposals",
    description: "View and create event / project proposals.",
  },
  {
    code: "feature:calendar",
    category: "Feature Access",
    name: "Access Event Calendar",
    description: "View multi-day event calendar and timeline.",
  },
  {
    code: "feature:kanban",
    category: "Feature Access",
    name: "Access Event Track / Kanban",
    description: "Access real-time dynamic event track and sticky note board.",
  },
  {
    code: "feature:dailylogs",
    category: "Feature Access",
    name: "Access Daily Logs",
    description: "View and submit daily accountability logs.",
  },
  {
    code: "feature:attendance",
    category: "Feature Access",
    name: "Access Attendance",
    description: "View attendance board and punch logs.",
  },
  {
    code: "feature:reviews",
    category: "Feature Access",
    name: "Access Reviews",
    description: "View and submit performance reviews.",
  },
  {
    code: "feature:analytics",
    category: "Feature Access",
    name: "Access Analytics",
    description: "View performance scoring and trends.",
  },
  {
    code: "feature:ai",
    category: "Feature Access",
    name: "Access AI Insights",
    description: "View AI program health insights.",
  },
  {
    code: "feature:reports",
    category: "Feature Access",
    name: "Access Reports",
    description: "Export PDF and Excel reports.",
  },
  {
    code: "feature:documents",
    category: "Feature Access",
    name: "Access Documents",
    description: "View and upload documents and offer letters.",
  },
  {
    code: "feature:activity",
    category: "Feature Access",
    name: "Access Activity Log",
    description: "View system audit trail and user actions.",
  },
  {
    code: "feature:finance",
    category: "Feature Access",
    name: "Access Finance Module",
    description: "View financial budgeting and pricing metrics.",
  },
  {
    code: "feature:design",
    category: "Feature Access",
    name: "Access Design Tasks",
    description: "View UI/UX design deliverables and media.",
  },
  {
    code: "feature:schedule",
    category: "Feature Access",
    name: "Access Schedule Manager",
    description: "Create and manage event timelines and schedules.",
  },
  {
    code: "feature:settings",
    category: "Feature Access",
    name: "Access Settings",
    description: "Manage system configurations and taxonomies.",
  },
  {
    code: "feature:permissions",
    category: "Feature Access",
    name: "Manage Roles & Permissions",
    description: "Super Admin control over system roles and permissions.",
  },

  // ── 2. Tasks & Event Track Controls ──
  {
    code: "task:create",
    category: "Task Controls",
    name: "Create Tasks",
    description: "Create new tasks in projects.",
  },
  {
    code: "task:read",
    category: "Task Controls",
    name: "View Tasks",
    description: "View tasks and task details.",
  },
  {
    code: "task:update",
    category: "Task Controls",
    name: "Edit Tasks",
    description: "Update task description, dates, hours, and tags.",
  },
  {
    code: "task:delete",
    category: "Task Controls",
    name: "Delete Tasks",
    description: "Remove tasks and subtasks.",
  },
  {
    code: "task:move",
    category: "Task Controls",
    name: "Move Sticky Notes / Cards",
    description: "Drag and move tasks across columns on Event Track.",
  },
  {
    code: "task:status_change",
    category: "Task Controls",
    name: "Change Task Status",
    description:
      "Advance or rework task status (Pending, In Progress, Review, Completed).",
  },
  {
    code: "task:assign",
    category: "Task Controls",
    name: "Assign Tasks",
    description: "Assign tasks to team members, teachers, or students.",
  },

  // ── 3. Event Track & Kanban Specifics ──
  {
    code: "event_track:view",
    category: "Event Track Controls",
    name: "View Event Track",
    description: "View live sticky-note Kanban event board.",
  },
  {
    code: "event_track:move_card",
    category: "Event Track Controls",
    name: "Drag & Reorder Cards",
    description: "Reorder sticky notes on the event track.",
  },
  {
    code: "event_track:manage",
    category: "Event Track Controls",
    name: "Manage Board Columns",
    description: "Configure event track layout and settings.",
  },

  // ── 4. Proposals & Events ──
  {
    code: "proposal:create",
    category: "Proposals & Events",
    name: "Create Proposals",
    description: "Submit workshops, trainings, retreats, and projects.",
  },
  {
    code: "proposal:read",
    category: "Proposals & Events",
    name: "View Proposals",
    description: "Inspect submitted event proposals.",
  },
  {
    code: "proposal:update",
    category: "Proposals & Events",
    name: "Edit Proposals",
    description: "Modify proposed schedules and deliverables.",
  },
  {
    code: "proposal:delete",
    category: "Proposals & Events",
    name: "Delete Proposals",
    description: "Cancel or remove proposals.",
  },
  {
    code: "proposal:review",
    category: "Proposals & Events",
    name: "Review & Convert Proposals",
    description: "Approve proposals and convert them to live projects/kanban.",
  },
  {
    code: "event:schedule",
    category: "Proposals & Events",
    name: "Schedule Events",
    description: "Book event dates and assign instructors/teachers.",
  },

  // ── 5. Analytics & Financial Controls ──
  {
    code: "analytics:read",
    category: "Analytics Controls",
    name: "View Analytics",
    description: "Inspect student scoring bands and progress charts.",
  },
  {
    code: "analytics:export",
    category: "Analytics Controls",
    name: "Export Analytics",
    description: "Download analytics data as Excel / PDF.",
  },
  {
    code: "analytics:financial",
    category: "Analytics Controls",
    name: "View Financial Analytics",
    description: "Inspect revenue projections, budgets, and pricing.",
  },
  {
    code: "report:generate",
    category: "Analytics Controls",
    name: "Generate Reports",
    description: "Generate formal batch and student evaluation reports.",
  },

  // ── 6. Companies, Batches, Teams & Users ──
  {
    code: "company:create",
    category: "Administration",
    name: "Create Company",
    description: "Provision new isolated company workspaces.",
  },
  {
    code: "company:read",
    category: "Administration",
    name: "View Company Details",
    description: "Inspect company configurations.",
  },
  {
    code: "company:update",
    category: "Administration",
    name: "Update Company",
    description: "Edit company branding and details.",
  },
  {
    code: "company:delete",
    category: "Administration",
    name: "Archive Company",
    description: "Archive or delete company workspaces.",
  },
  {
    code: "company:switch",
    category: "Administration",
    name: "Switch Active Company",
    description: "Super Admin topbar workspace switcher.",
  },
  {
    code: "user:create",
    category: "Administration",
    name: "Create Users",
    description: "Provision new system users and accounts.",
  },
  {
    code: "user:read",
    category: "Administration",
    name: "View Users",
    description: "Inspect user list and profiles.",
  },
  {
    code: "user:update",
    category: "Administration",
    name: "Update Users",
    description: "Edit user designations and roles.",
  },
  {
    code: "user:delete",
    category: "Administration",
    name: "Deactivate Users",
    description: "Disable user access.",
  },
  {
    code: "user:manage_permissions",
    category: "Administration",
    name: "User Permission Overrides",
    description: "Assign individual permission overrides per user.",
  },
  {
    code: "batch:create",
    category: "Administration",
    name: "Create Batches",
    description: "Create new internship cohort batches.",
  },
  {
    code: "batch:read",
    category: "Administration",
    name: "View Batches",
    description: "View batch timelines and rosters.",
  },
  {
    code: "batch:update",
    category: "Administration",
    name: "Update Batches",
    description: "Modify batch dates and metadata.",
  },
  {
    code: "batch:delete",
    category: "Administration",
    name: "Delete Batches",
    description: "Archive or remove batches.",
  },
  {
    code: "project:create",
    category: "Administration",
    name: "Create Projects",
    description: "Initialize new projects and milestones.",
  },
  {
    code: "project:read",
    category: "Administration",
    name: "View Projects",
    description: "Inspect projects and repositories.",
  },
  {
    code: "project:update",
    category: "Administration",
    name: "Update Projects",
    description: "Edit project deliverables and repository links.",
  },
  {
    code: "project:delete",
    category: "Administration",
    name: "Delete Projects",
    description: "Archive or delete projects.",
  },
  {
    code: "team:manage",
    category: "Administration",
    name: "Manage Teams",
    description: "Assign team leaders and developer roles.",
  },

  // ── 7. Daily Logs, Attendance & Reviews ──
  {
    code: "dailylog:create",
    category: "Daily Workflow",
    name: "Submit Daily Log",
    description: "Submit mandatory daily work report.",
  },
  {
    code: "dailylog:read",
    category: "Daily Workflow",
    name: "View All Daily Logs",
    description: "Inspect daily logs submitted across the company.",
  },
  {
    code: "dailylog:read-own",
    category: "Daily Workflow",
    name: "View Own Daily Logs",
    description: "View personal submitted logs.",
  },
  {
    code: "review:create",
    category: "Daily Workflow",
    name: "Submit Reviews",
    description: "Approve/reject/rework daily logs and tasks with ratings.",
  },
  {
    code: "review:read",
    category: "Daily Workflow",
    name: "View Reviews",
    description: "Inspect review feedbacks and verdicts.",
  },
  {
    code: "attendance:read",
    category: "Daily Workflow",
    name: "View Attendance",
    description: "View daily attendance roster.",
  },
  {
    code: "attendance:manage",
    category: "Daily Workflow",
    name: "Manage Attendance",
    description: "Mark leaves, holidays, and manual attendance adjustments.",
  },
  {
    code: "document:manage",
    category: "Daily Workflow",
    name: "Manage Documents",
    description: "Upload and verify contracts and certificates.",
  },
  {
    code: "document:read-own",
    category: "Daily Workflow",
    name: "View Own Documents",
    description: "View assigned personal documents.",
  },
  {
    code: "settings:manage",
    category: "Administration",
    name: "Manage System Settings",
    description: "Configure system holidays and parameters.",
  },
  {
    code: "activity:read",
    category: "Administration",
    name: "View Audit Trail",
    description: "Inspect system audit activity logs.",
  },
  {
    code: "permissions:manage",
    category: "Administration",
    name: "Manage Role Permissions",
    description: "Modify global role permission matrix.",
  },
] as const;

export const PERMISSIONS = PERMISSION_DEFINITIONS.map((p) => p.code);
export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  MANAGER: [],
  SENIOR: [],
  EXECUTIVE: [],
  INTERN: [],
};

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ...DEFAULT_ROLE_PERMISSIONS,
};
