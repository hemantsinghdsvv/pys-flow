import Link from "next/link";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  User as UserIcon,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { Proposal } from "@prisma/client";
import {
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_SCHEDULE_LABELS,
  PROPOSAL_LOCATION_LABELS,
} from "@/config/labels";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export type ProposalWithRelations = Proposal & {
  createdBy: { id: string; name: string; image?: string | null };
  teacher?: { id: string; name: string; image?: string | null } | null;
  reviewer?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
};

export function ProposalCard({ proposal }: { proposal: ProposalWithRelations }) {
  const teacherDisplay = proposal.teacher?.name || proposal.teacherName || "Unassigned";

  return (
    <Card className="flex flex-col justify-between transition-all hover:border-primary/50 hover:shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={proposal.type} label={PROPOSAL_TYPE_LABELS[proposal.type]} />
            <StatusBadge status={proposal.locationType} label={PROPOSAL_LOCATION_LABELS[proposal.locationType]} />
          </div>
          <StatusBadge status={proposal.status} label={PROPOSAL_STATUS_LABELS[proposal.status]} />
        </div>

        <Link
          href={`/propose/${proposal.id}`}
          className="line-clamp-2 text-base font-semibold tracking-tight hover:text-primary hover:underline"
        >
          {proposal.title}
        </Link>
      </CardHeader>

      <CardContent className="space-y-3 pb-3 text-xs text-muted-foreground">
        {proposal.objectives && (
          <p className="line-clamp-2 italic text-foreground/80">
            &ldquo;{proposal.objectives}&rdquo;
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1 border-t">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {proposal.startDate ? format(proposal.startDate, "d MMM yyyy") : "No date"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            <span>
              {proposal.totalHours ? `${proposal.totalHours} hrs` : PROPOSAL_SCHEDULE_LABELS[proposal.scheduleType]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium text-foreground">{teacherDisplay}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <Users className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{proposal.capacity ? `${proposal.capacity} seats` : "Open capacity"}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{proposal.locationName || PROPOSAL_LOCATION_LABELS[proposal.locationType]}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <DollarSign className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{proposal.pricing ? `$${proposal.pricing}` : "Free"}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2 border-t text-xs">
        <span className="text-muted-foreground">
          By {proposal.createdBy.name}
        </span>
        <div className="flex items-center gap-2">
          {proposal.project && (
            <Button variant="outline" size="sm" asChild className="h-7 gap-1 text-xs">
              <Link href={`/kanban?project=${proposal.project.id}`}>
                <ExternalLink className="size-3" /> Kanban
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
            <Link href={`/propose/${proposal.id}`}>
              View details <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
