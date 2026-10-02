"use client";

import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Globe } from "lucide-react";
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
        <Button variant="outline" size="sm" className="h-8 gap-2">
          {active ? (
            <Building2 className="size-3.5" />
          ) : (
            <Globe className="size-3.5" />
          )}
          <span className="max-w-36 truncate">
            {active?.name ?? "All Companies"}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Company scope</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => select(null)}>
          <Globe className="size-4" />
          All Companies
          <Check
            className={cn(
              "ml-auto size-4",
              activeId === null ? "opacity-100" : "opacity-0"
            )}
          />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem key={company.id} onClick={() => select(company.id)}>
            <Building2 className="size-4" />
            <span className="truncate">{company.name}</span>
            <Check
              className={cn(
                "ml-auto size-4",
                activeId === company.id ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
