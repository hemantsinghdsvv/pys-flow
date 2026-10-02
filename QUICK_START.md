# DRISHTI — Quick Start & Setup Guide

Welcome to **DRISHTI** (Internship Management & Accountability Platform). Follow these simple steps to run the application locally or in production.

---

## 📋 Prerequisites
- **Node.js**: v20 or higher recommended ([Download Node.js](https://nodejs.org/))
- **npm** (comes with Node.js)

---

## 🚀 Setup Steps

### 1. Install Dependencies
Open your terminal in the project root directory and run:
```bash
npm install
```

### 2. Configure Environment (`.env`)
The `.env` file is already pre-configured for local development.
- For local development, no changes are needed if using the built-in embedded database.
- For production, configure your own:
  - `BETTER_AUTH_SECRET`: A secure random string (minimum 32 characters)
  - `DATABASE_URL` & `DIRECT_URL`: Your PostgreSQL connection string (Supabase, Neon, AWS RDS, Docker, etc.)
  - `SMTP_*`: Your email credentials (optional, e.g., Brevo, SendGrid, Amazon SES)
  - `CRON_SECRET`: A secure token to protect scheduled background endpoints

### 3. Start the Database
You have two options:

#### Option A: Built-in Zero-Config Local PostgreSQL (Recommended for local dev)
Runs a local embedded PostgreSQL server on port `55432` without needing any external database installed:
```bash
npm run db:dev
```
*(Keep this terminal open while developing)*

#### Option B: External PostgreSQL Database
Update `DATABASE_URL` and `DIRECT_URL` in your `.env` file with your Postgres connection string.

### 4. Push Schema & Seed Initial Data
In a new terminal window, apply the database schema and load initial roles and demo data:
```bash
npm run db:push
npm run db:seed
```

### 5. Start the Application
Run the Next.js development server:
```bash
npm run dev
```

The application will be running at:
👉 **http://localhost:3005**

---

## 🔑 Default Login Credentials

After running `npm run db:seed`, the following accounts are available for testing:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@example.com` | `Password@123` |

*(Additional role-based demo accounts for Company Admin, Mentors, and Students are displayed in the terminal during the seed script).*

---

## 🛠 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js dev server on port 3005 |
| `npm run db:dev` | Starts the local embedded PostgreSQL server |
| `npm run db:push` | Synchronizes Prisma schema with database |
| `npm run db:seed` | Populates database with default roles, permissions & demo data |
| `npm run build` | Builds the production bundle |
| `npm run start` | Starts the production Next.js server |
| `npm run lint` | Runs ESLint code quality checks |
