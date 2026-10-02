import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3005"),
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "http://localhost:3005",
    "https://*.onrender.com",
    "https://*.vercel.app",
  ].filter(Boolean) as string[],
  emailAndPassword: {
    enabled: true,
    // Users are provisioned by admins (invite-based); public signup is
    // handled through the server action that also creates profiles.
    disableSignUp: false,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      isSystemAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      roleId: {
        type: "string",
        required: false,
        input: false,
      },
      companyId: { type: "string", required: false, input: false },
      phone: { type: "string", required: false },
      designation: { type: "string", required: false },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // Capture attendance login + activity on every new session.
          try {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
            });
            if (!user) return;

            await prisma.user.update({
              where: { id: user.id },
              data: { lastActiveAt: new Date() },
            });

            if (user.companyId) {
              const today = new Date();
              today.setUTCHours(0, 0, 0, 0);
              await prisma.attendance.upsert({
                where: {
                  userId_date: { userId: user.id, date: today },
                },
                create: {
                  userId: user.id,
                  companyId: user.companyId,
                  date: today,
                  loginAt: new Date(),
                  status: "PRESENT",
                },
                update: {}, // keep first login of the day
              });
            }

            await prisma.activityLog.create({
              data: {
                userId: user.id,
                companyId: user.companyId,
                action: "LOGIN",
                entityType: "Session",
                entityName: user.email,
              },
            });
          } catch (err) {
            console.error("session.create hook failed", err);
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
