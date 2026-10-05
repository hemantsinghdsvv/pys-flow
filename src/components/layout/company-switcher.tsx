"use client";

import { useRouter } from "next/navigation";
import { MapPin, Building2, Check, ChevronsUpDown } from "lucide-react";
import { setActiveCompany } from "@/features/companies/switch-action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type CompanyOption = { id: string; name: string };

export function CompanySwitcher({
  companies,
  activeId,
}: {
  companies: CompanyOption[];
  activeId: string | null;
}) {
  const router = useRouter();
  const active = companies.find((c) => c.id === activeId);

  async function select(id: string | null) {
    await setActiveCompany(id);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-border/80 shadow-xs">
          <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="max-w-36 truncate font-medium">
            {active?.name ?? "All Studios"}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Studio Location
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => select(null)} className="gap-2 cursor-pointer font-medium">
          <Building2 className="size-4 text-muted-foreground" />
          All Studios
          <Check
            className={cn(
              "ml-auto size-4 text-emerald-600",
              activeId === null ? "opacity-100" : "opacity-0"
            )}
          />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => select(company.id)}
            className="gap-2 cursor-pointer font-medium"
          >
            <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">{company.name}</span>
            <Check
              className={cn(
                "ml-auto size-4 text-emerald-600",
                activeId === company.id ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
