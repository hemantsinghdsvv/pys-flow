"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/config/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ allowedHrefs = [], departments = [], activeRoleContext = null }: { allowedHrefs?: string[], departments?: any[], activeRoleContext?: any }) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowedHrefs.includes(item.href)),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/70 pb-3 pt-3 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-16 px-2.5 hover:bg-sidebar-accent/70 rounded-xl transition-all duration-200 group/brand"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="relative flex aspect-square size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-white/20 p-1 group-hover/brand:scale-105 transition-transform duration-200">
                  <Image
                    src="/logo.svg"
                    alt="Pragya Yog School"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden overflow-hidden">
                  <span className="truncate font-serif text-[17px] font-semibold tracking-normal text-sidebar-foreground">
                    Pragya Yog School
                  </span>
                  <span className="truncate font-sans text-[11px] font-semibold tracking-wider text-[#D9AE29] flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block size-1.5 rounded-full bg-[#9D9D48] animate-pulse" />
                    Central HK · PYS Portal
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(`${item.href}/`)) ||
                    (item.href !== "/dashboard" && pathname === item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
