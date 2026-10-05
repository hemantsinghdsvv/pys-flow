import {
  LayoutDashboard,
  FolderGit2,
  ListTodo,
  KanbanSquare,
  Compass,
  GraduationCap,
  Users,
  Settings,
  Layers,
  Award,
  Activity,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/permission-constants";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  permission?: Permission;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "feature:dashboard",
      },
    ],
  },
  {
    label: "Core Modules",
    items: [
      {
        title: "Batches & Cohorts",
        href: "/batches",
        icon: Layers,
      },
      {
        title: "Projects",
        href: "/projects",
        icon: FolderGit2,
      },
      {
        title: "Tasks",
        href: "/tasks",
        icon: ListTodo,
        permission: "feature:tasks",
      },
      {
        title: "Task Kanban",
        href: "/kanban",
        icon: KanbanSquare,
        permission: "feature:kanban",
      },
      {
        title: "Events & Workshops",
        href: "/events",
        icon: Compass,
        permission: "feature:propose",
      },
      {
        title: "Internships",
        href: "/internship",
        icon: Award,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Staff & Roles",
        href: "/team",
        icon: Users,
        permission: "feature:settings",
      },
      {
        title: "Activity Log",
        href: "/activity-log",
        icon: Activity,
        permission: "feature:settings",
      },
    ],
  },
];
