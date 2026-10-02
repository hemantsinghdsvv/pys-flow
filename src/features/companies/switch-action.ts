"use server";

import { cookies } from "next/headers";
import { requireRole, ACTIVE_COMPANY_COOKIE } from "@/lib/access";

/** Super-admin-only: switch the active company scope. */
export async function setActiveCompany(companyId: string | null) {
  await requireRole("MANAGER");
  const store = await cookies();
  if (companyId) {
    store.set(ACTIVE_COMPANY_COOKIE, companyId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } else {
    store.set(ACTIVE_COMPANY_COOKIE, "all", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}
