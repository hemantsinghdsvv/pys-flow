"use client";

import { useState, useTransition } from "react";
import { Crown, Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { TeamRole } from "@prisma/client";
import {
  createTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from "@/features/projects/actions";
import { TEAM_ROLE_LABELS } from "@/config/labels";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TeamMemberView = {
  userId: string;
  name: string;
  image: string | null;
  role: TeamRole;
  isLeader: boolean;
};

export type TeamView = {
  id: string;
  name: string;
  description: string | null;
  members: TeamMemberView[];
};

export type PersonOption = { id: string; name: string };

function AddMemberDialog({
  teamId,
  people,
}: {
  teamId: string;
  people: PersonOption[];
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<TeamRole>("FULLSTACK_DEVELOPER");
  const [isLeader, setIsLeader] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!userId) return;
    startTransition(async () => {
      try {
        await addTeamMember(teamId, userId, role, isLeader);
        toast.success("Member added");
        setOpen(false);
        setUserId("");
        setIsLeader(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add member");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="size-4" /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Person</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a person" />
              </SelectTrigger>
              <SelectContent>
                {people.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No students available. Assign students to the project first.
                  </div>
                ) : (
                  people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Team role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEAM_ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="leader" checked={isLeader} onCheckedChange={setIsLeader} />
            <Label htmlFor="leader">Team leader</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={pending || !userId}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamsPanel({
  projectId,
  teams,
  people,
  canManage,
}: {
  projectId: string;
  teams: TeamView[];
  people: PersonOption[];
  canManage: boolean;
}) {
  const [teamName, setTeamName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreateTeam() {
    if (teamName.trim().length < 2) return;
    startTransition(async () => {
      try {
        await createTeam(projectId, { name: teamName.trim(), description: "" });
        toast.success("Team created");
        setTeamName("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create team");
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex max-w-md gap-2">
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="New team name, e.g. Frontend Squad"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateTeam();
              }
            }}
          />
          <Button
            onClick={handleCreateTeam}
            disabled={pending || teamName.trim().length < 2}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create team
          </Button>
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Group assigned students into teams with roles like Frontend Developer or QA."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {teams.map((team) => {
            const memberIds = new Set(team.members.map((m) => m.userId));
            const available = people.filter((p) => !memberIds.has(p.id));
            return (
              <Card key={team.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <AddMemberDialog teamId={team.id} people={available} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        aria-label="Delete team"
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await deleteTeam(team.id);
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : "Failed"
                              );
                            }
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {team.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No members yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {team.members.map((member) => (
                        <li
                          key={member.userId}
                          className="flex items-center gap-3 py-2"
                        >
                          <UserAvatar name={member.name} image={member.image} />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                              {member.name}
                              {member.isLeader && (
                                <Crown className="size-3.5 text-amber-500" />
                              )}
                            </p>
                            <Badge variant="outline" className="mt-0.5 text-xs">
                              {TEAM_ROLE_LABELS[member.role]}
                            </Badge>
                          </div>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              aria-label="Remove member"
                              onClick={() =>
                                startTransition(async () => {
                                  try {
                                    await removeTeamMember(
                                      team.id,
                                      member.userId
                                    );
                                  } catch (err) {
                                    toast.error(
                                      err instanceof Error
                                        ? err.message
                                        : "Failed"
                                    );
                                  }
                                })
                              }
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
