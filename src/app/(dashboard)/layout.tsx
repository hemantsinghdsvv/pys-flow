import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/access";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RealtimeListener } from "@/components/layout/realtime-listener";
import { getAllowedHrefs } from "@/lib/nav-server";
import { fetchPragyaAPI } from "@/lib/pragya-api";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  // Get active role context early to pass it to getAllowedHrefs
  const activeRoleCookie = (await cookies()).get("drishti_active_role")?.value;
  let activeRoleContext = null;
  if (activeRoleCookie) {
    try {
      activeRoleContext = JSON.parse(activeRoleCookie);
    } catch {}
  }

  // Pass activeRoleId so that sub-roles properly start from zero permissions
  const allowedHrefs = getAllowedHrefs({ 
    role: activeRoleContext ? activeRoleContext.roleName : user.role, 
    id: user.id,
    activeRoleId: activeRoleContext?.roleId,
    roleId: user.roleId,
    isSystemAdmin: user.isSystemAdmin
  });
  
  // Fetch Pragya Departments for the Sidebar Switcher
  let departments = [];
  try {
    const res = await fetchPragyaAPI("departments");
    if (res?.status) departments = res.data;
  } catch (error) {
    console.error("Failed to load departments for sidebar", error);
  }



  return (
    <SidebarProvider>
      <RealtimeListener role={user.role} userId={user.id} />
      <AppSidebar 
        allowedHrefs={allowedHrefs} 
        departments={departments} 
        activeRoleContext={activeRoleContext} 
      />
      <SidebarInset>
        <Topbar user={user} />
        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
