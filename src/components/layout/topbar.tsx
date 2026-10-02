import Link from "next/link";
import { Bell } from "lucide-react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ACTIVE_COMPANY_COOKIE, type SessionUser } from "@/lib/access";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import { GlobalSearch } from "@/components/layout/global-search";
import { Button } from "@/components/ui/button";

export async function Topbar({ user }: { user: SessionUser }) {
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  let switcher = null;
  if (user.isSystemAdmin === true) {
    const companies = await prisma.company.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    const store = await cookies();
    const raw = store.get(ACTIVE_COMPANY_COOKIE)?.value;
    const activeId =
      raw && raw !== "all" && companies.some((c) => c.id === raw) ? raw : null;
    switcher = <CompanySwitcher companies={companies} activeId={activeId} />;
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 !h-5" />
      {switcher}
      <div className="ml-auto flex items-center gap-1.5">
        <GlobalSearch />
        <Button variant="ghost" size="icon" className="relative size-8" asChild>
          <Link href="/notifications">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex size-2 rounded-full bg-destructive" />
            )}
            <span className="sr-only">Notifications</span>
          </Link>
        </Button>
        <ThemeToggle />
        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          role={user.role}
        />
      </div>
    </header>
  );
}
