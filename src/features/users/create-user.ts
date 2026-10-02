import "server-only";
import { hashPassword } from "better-auth/crypto";

import { prisma } from "@/lib/prisma";

/**
 * Provision a credentials user (invite-based — admins create accounts).
 * Mirrors Better Auth's account layout so the user can sign in normally.
 */
export async function provisionUser(opts: {
  name: string;
  email: string;
  password: string;
  isSystemAdmin: boolean;
  companyId: string | null;
  phone?: string;
  designation?: string;
}) {
  const email = opts.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error(`A user with email ${email} already exists.`);

  const passwordHash = await hashPassword(opts.password);
  return prisma.user.create({
    data: {
      name: opts.name.trim(),
      email,
      emailVerified: true,
      isSystemAdmin: opts.isSystemAdmin,
      companyId: opts.companyId,
      phone: opts.phone || null,
      designation: opts.designation || null,
      accounts: {
        create: {
          accountId: email,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
}

/** Generate a readable temporary password. */
export function generatePassword() {
  return "Scholar@7488";
}
