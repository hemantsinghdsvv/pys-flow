# DRISHTI — Internship Management & Accountability Platform

DRISHTI is a production-grade platform for a CS Department / Software Development
Cell to run internships across multiple companies under one Super Admin. Beyond
generic project management, its core is **student accountability**: mandatory
daily work logs, mentor reviews, attendance, GitHub tracking, and an automated
performance-scoring engine — all isolated per company.

Built entirely on a **free / open-source stack** (with optional free-tier hosted
services for DB, file storage, and email).

## Tech Stack

- **Next.js 15** (App Router, Server Actions, RSC) · **TypeScript** (strict)
- **TailwindCSS v4** · **shadcn/ui** (new-york) · **Recharts** · **@dnd-kit**
- **Prisma v6** ORM + **PostgreSQL**
- **Better Auth** — email/password, role-based, invite-only provisioning
- **TanStack Table / Query** · **React Hook Form + Zod**
- **UploadThing** (file storage) · **Nodemailer** (SMTP, env-gated)
- **exceljs / pdf-lib** (report exports)
- **Ollama** (optional, local LLM for AI narratives — env-gated)

## Roles & Access

`SUPER_ADMIN · COMPANY_ADMIN · COORDINATOR · MENTOR · STUDENT`

- RBAC via `src/lib/permissions.ts` (`can(role, permission)`), enforced in every
  server action and reflected in the role-filtered sidebar.
- **Company isolation**: every scoped query passes through `companyScope()`.
  Super Admins switch the active company via the topbar switcher (cookie-backed);
  all other roles are hard-bound to their own `companyId`.
- Soft delete + activity logging on all mutating actions.

## Features

- **Companies, Batches, Students, Mentors, Projects, Teams** — full CRUD.
- **Tasks & Kanban** — subtasks, dependencies, drag-drop board, comments.
- **Reviews** — approve / reject / rework loop feeding task & daily-log status.
- **Daily Logs** — one-per-day, edit-until-approved, mentor review.
- **Attendance** — per-day board, auto-absence marking via cron.
- **GitHub tracking** — repositories + commit/PR/issue/release link registry
  per project (Repositories tab on the project page).
- **Analytics** — Recharts dashboards; **scoring engine** produces Green/Yellow/Red
  performance bands (see below).
- **Reports** — Students / Tasks / Daily logs (Excel) and Summary (PDF).
- **AI Insights** — rule-based program-health heuristics, optionally augmented
  with an Ollama-generated narrative.
- **Notifications, Documents, Global search (⌘K), Settings, Activity log, Profile.**

## Accountability Scoring Engine

`src/lib/scoring.ts` computes a weighted 0-100 score per student over a trailing
30-day window:

| Metric | Weight | Basis |
| --- | --- | --- |
| Submission | 25% | daily reports ÷ working days |
| Task completion | 25% | completed ÷ assigned tasks |
| Attendance | 15% | present days ÷ working days |
| Review | 15% | avg mentor rating (1–5) |
| Deadline | 10% | tasks finished on time |
| GitHub | 10% | commit links logged |

Bands: **Green ≥ 75 · Yellow ≥ 50 · Red < 50**. Scores surface on the profile
and student pages, and are snapshotted daily by the cron endpoint.

## Getting Started

### 1. Install & configure

```bash
npm install
cp .env.example .env   # then fill in the values below
```

Required env vars (see `.env`):

```
DATABASE_URL=postgresql://...        # any PostgreSQL (Neon free tier works)
BETTER_AUTH_SECRET=...               # random string
BETTER_AUTH_URL=http://localhost:3005
NEXT_PUBLIC_APP_URL=http://localhost:3005
UPLOADTHING_TOKEN=...                # optional (file uploads)
SMTP_HOST/PORT/USER/PASS/FROM=...    # optional (email notifications)
CRON_SECRET=...                      # protects /api/cron/* endpoints
OLLAMA_URL=                          # optional (AI narratives, e.g. http://localhost:11434)
```

### 2. Database

```bash
npx prisma generate
npm run db:push      # apply schema
npm run db:seed      # seed super admin, companies, users, sample data
```

> A local zero-install Postgres is also available via `npm run db:dev`
> (embedded-postgres on port 55432) if you don't want a hosted DB.

### 3. Run

```bash
npm run dev          # http://localhost:3005
```

**Default super admin:** `admin@example.com` / `Password@123`
(See seed output for other role-based demo accounts)

## Scheduled Jobs (cron)

Protected by `CRON_SECRET` (`Authorization: Bearer <secret>` or `?secret=`).
Wire these to Vercel Cron or any scheduler:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/cron/snapshots` | Compute & persist daily performance snapshots |
| `GET /api/cron/mark-absences` | Mark students absent + missed-report alerts |
| `GET /api/cron/reminders` | Nudge students who haven't logged today |

## Project Structure

```
src/
├── app/(auth)/            login
├── app/(dashboard)/       all feature pages
├── app/api/               auth · uploadthing · reports · cron
├── components/ui|layout|shared/
├── features/<module>/     actions.ts · schemas.ts · queries.ts · components/
└── lib/                   auth · prisma · access · permissions · scoring · ai · storage
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (port 3005) |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to the DB |
| `npm run db:seed` | Seed demo data |
| `npm run db:dev` | Start local embedded Postgres |
| `npm run lint` | ESLint |
