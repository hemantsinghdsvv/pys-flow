# PYS Flow — Pragya Yog School Operations Portal

PYS Flow is a production-grade operational dashboard and management platform designed specifically for Pragya Yog School (Central Hong Kong). It serves as a central hub for staff, faculty, and administrators to track events, manage tasks via Kanban boards, handle proposals, and maintain a real-time directory of the yoga school's operational roster.

Built entirely on a **modern open-source stack**, focusing on performance, mobile responsiveness, and intuitive UI/UX for yoga teachers and administrative staff.

## Tech Stack

- **Next.js 15** (App Router, Server Actions, RSC) · **TypeScript** (strict)
- **TailwindCSS v4** · **shadcn/ui** (new-york) · **Recharts** · **@dnd-kit** (Drag & Drop)
- **Prisma v6** ORM + **PostgreSQL**
- **Better Auth** — email/password, role-based access control
- **TanStack Table / Query** · **React Hook Form + Zod**
- **UploadThing** (file storage) · **Nodemailer** (SMTP, env-gated)

## Roles & Access

The platform operates on a hierarchical role-based access control (RBAC) system:

- **Level 1**: Director & Full Administrator (Admin)
- **Level 2**: Lead & Management (Master Teacher, Finance, Schedule Manager, Operations Lead)
- **Level 3**: Staff & Instructors (Instructor, Guest Teacher, Front Desk)
- **Level 4**: Interns (Yoga Instructor Intern)

RBAC is enforced via `src/lib/permissions.ts` (`can(role, permission)`), securing every server action and dynamically rendering sidebar and dashboard components.

## Core Features

- **Executive Dashboard** — Quick KPI overviews for directors, combining active programs, task progress, and critical action items.
- **Dynamic Kanban Board (Event Track)** — Real-time synchronized event & task sticky notes. Drag cards across workflow columns to update the underlying state of workshops, teacher trainings, and retreats.
- **Event Proposals Pipeline** — Teachers and staff can propose new workshops/retreats. Admins review, approve, and automatically convert them into active Kanban tracking.
- **Task & Project Management** — Assign tasks to staff, track deadlines, priorities, and subtasks. Soft delete and activity logging included.
- **Team Directory** — A mobile-responsive staff directory managing the entire roster, including the Yoga & Teaching faculty and Studio Operations teams.
- **Fully Mobile Responsive** — Complex grid layouts, kanban boards, and data tables gracefully adapt into swipable cards and stacked layouts on iPhones and iPads.
- **Activity Log** — Centralized logging for all critical mutating actions and system events.

## Getting Started

### 1. Install & configure

```bash
npm install
cp .env.example .env   # then fill in the values below
```

Required env vars (see `.env`):

```
DATABASE_URL=postgresql://...        # any PostgreSQL (Neon free tier works)
BETTER_AUTH_SECRET=...               # random string generated via `openssl rand -hex 32`
BETTER_AUTH_URL=http://localhost:3005
NEXT_PUBLIC_APP_URL=http://localhost:3005
```

### 2. Database Setup

Apply the schema and seed the initial roles, departments, and Pragya Yog School staff data:

```bash
npx prisma generate
npm run db:push      
npx tsx scripts/seed-pyshk-staff.ts   # Seed PYS staff roles and demo accounts
```

### 3. Run Development Server

```bash
npm run dev          # Runs on http://localhost:3005
```

**Demo Login:**
The login page (`/login`) is pre-configured with quick-access buttons for all seeded roles, allowing you to instantly switch between Admin, Instructor, Finance, or Front Desk viewpoints without typing credentials.

## Project Structure

```
src/
├── app/(auth)/            Login and authentication routes
├── app/(dashboard)/       Dashboard layouts, Kanban, Projects, Team, Propose
├── components/            Shared UI components (shadcn/ui), Layouts, Sidebar
├── features/<module>/     Actions, components, and logic grouped by domain (auth, kanban, projects, tasks, events, etc.)
└── lib/                   Prisma client, Better Auth config, Access & Permissions rules
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (port 3005) |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to the DB |
| `npm run lint` | Run ESLint |
