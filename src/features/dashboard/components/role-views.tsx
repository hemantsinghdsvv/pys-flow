import { User, Project, Task, Department } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AlertTriangle, ListTodo, Users, Building, Activity, Plus, ClipboardList, ChevronDown, ChevronUp, Code } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { fetchPragyaAPI } from "@/lib/pragya-api";
import { formatTime, formatMinutes } from "@/lib/utils";

type PopulatedTask = Task & { assignee: User | null };
type PopulatedProject = Project & { tasks: Task[] };

export function AdminDashboardView({ 
  projects, 
  tasks, 
  token,
  currentUser
}: { 
  projects: PopulatedProject[], 
  tasks: PopulatedTask[], 
  token: string | undefined,
  currentUser?: any
}) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 mt-8 fade-in">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold uppercase text-primary tracking-wider">Overall System Progress</span>
            <span className="font-bold text-primary text-xl">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3 bg-primary/20" />
        </CardContent>
      </Card>

      <PragyaLiveIntegration token={token} currentUser={currentUser} />
      <ProjectListView projects={projects} />
      <TaskListView tasks={tasks} showAssignButton={true} />
    </div>
  );
}

export function LeadDashboardView({ 
  user,
  projects, 
  tasks,
  teamMembers,
  token,
  currentUser
}: { 
  user: { name: string; isSystemAdmin: boolean; id: string },
  projects: PopulatedProject[], 
  tasks: PopulatedTask[],
  teamMembers: User[],
  token: string | undefined,
  currentUser?: any
}) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 mt-8 fade-in">
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold uppercase text-blue-600 dark:text-blue-400 tracking-wider">Team Progress</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-xl">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3 bg-blue-500/20" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b mb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-5 text-blue-500" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="bg-primary/10 rounded-xl px-4 py-3 flex items-center gap-3 border border-primary/20 shadow-sm">
              <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.isSystemAdmin ? "System Admin" : "Lead"}</div>
              </div>
              <Badge variant="secondary" className="ml-2 text-xs">You (Lead)</Badge>
            </div>
            {teamMembers.filter(m => m.id !== user.id).map(m => (
              <div key={m.id} className="bg-muted/40 rounded-xl px-4 py-3 flex items-center gap-3 border hover:bg-muted/80 transition-colors">
                <div className="size-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground text-lg">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{(m as any).displayRole || (m.isSystemAdmin ? "System Admin" : "User")}</div>
                </div>
              </div>
            ))}
            {teamMembers.length <= 1 && (
              <div className="text-sm text-muted-foreground py-2 flex items-center">No other members in your department.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <PragyaLiveIntegration token={token} currentUser={currentUser} />
      <ProjectListView projects={projects} />
      <TaskListView tasks={tasks} showAssignButton={true} />
    </div>
  );
}

export function MemberDashboardView({ 
  user,
  projects, 
  tasks,
  token,
  currentUser
}: { 
  user: { name: string; isSystemAdmin: boolean; id: string },
  projects: PopulatedProject[], 
  tasks: PopulatedTask[],
  token: string | undefined,
  currentUser?: any
}) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 mt-8 fade-in">
      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Your Personal Progress</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xl">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3 bg-indigo-500/20" />
        </CardContent>
      </Card>

      <PragyaLiveIntegration token={token} currentUser={currentUser} />
      <ProjectListView projects={projects} />
      <TaskListView tasks={tasks} showAssignButton={false} />
    </div>
  );
}

function ProjectListView({ projects }: { projects: PopulatedProject[] }) {
  if (projects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3 border-b mb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-5 text-indigo-500" />
          Projects Overview
          <span className="text-xs font-normal text-muted-foreground ml-2">({projects.length} Active)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const totalTasks = p.tasks.length;
            const completedTasks = p.tasks.filter(t => t.status === "COMPLETED").length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return (
              <div key={p.id} className="bg-card rounded-xl p-5 border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-2">
                    <h4 className="font-semibold text-foreground truncate" title={p.name}>{p.name}</h4>
                    <Badge variant="secondary" className="mt-1.5 font-medium">{p.status}</Badge>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-primary">{progress}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{totalTasks} Tasks</span>
                  </div>
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">{p.description}</p>}
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskListView({ tasks, showAssignButton }: { tasks: PopulatedTask[], showAssignButton?: boolean }) {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <Card>
      <CardHeader className="pb-3 border-b mb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="size-5 text-primary" />
          Tasks Board
          <span className="text-xs font-normal text-muted-foreground ml-2">({tasks.length} total)</span>
        </CardTitle>
        {showAssignButton && (
          <Button size="sm" asChild className="bg-primary hover:bg-primary/90">
            <Link href="/tasks/new">
              <Plus className="size-4 mr-2" />
              Assign Task
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <div className="rounded-md sm:border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50 hidden sm:table-header-group">
              <TableRow>
                <TableHead className="font-semibold">Task Title</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Assignee</TableHead>
                <TableHead className="font-semibold text-right">Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <ListTodo className="size-10 text-muted-foreground/30 mb-3" />
                      <p>No tasks found for your role</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTasks.map(task => {
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED";
                  
                  // Status badge colors similar to HTML file
                  let statusColor = "bg-secondary";
                  const statusStr = task.status as string;
                  if (statusStr === "COMPLETED") statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
                  if (statusStr === "REVIEW") statusColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
                  if (statusStr === "PENDING") statusColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                  if (statusStr === "CANCELLED") statusColor = "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400";

                  // Priority colors
                  let priorityColor = "border-muted-foreground/30";
                  if (task.priority === "URGENT") priorityColor = "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20";
                  if (task.priority === "HIGH") priorityColor = "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20";

                  return (
                    <TableRow key={task.id} className="group hover:bg-muted/50 transition-colors flex flex-col sm:table-row border-b sm:border-0 p-4 sm:p-0">
                      <TableCell className="font-medium sm:w-[40%] px-0 sm:px-4">
                        <Link href={`/tasks/${task.id}`} className="hover:underline hover:text-primary transition-colors block text-base sm:text-sm mb-2 sm:mb-0">
                          {task.title}
                        </Link>
                      </TableCell>
                      <TableCell className="px-0 sm:px-4 py-1 sm:py-4">
                        <Badge variant="outline" className={`text-[10px] font-bold ${priorityColor}`}>{task.priority}</Badge>
                      </TableCell>
                      <TableCell className="px-0 sm:px-4 py-1 sm:py-4">
                        <Badge variant="secondary" className={`text-xs ${statusColor} hover:${statusColor} border-0`}>{task.status.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm px-0 sm:px-4 py-1 sm:py-4 flex items-center gap-2">
                        <div className="size-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground sm:hidden">
                          {task.assignee ? task.assignee.name.charAt(0) : "?"}
                        </div>
                        {task.assignee ? task.assignee.name : "Unassigned"}
                      </TableCell>
                      <TableCell className={`text-right text-sm px-0 sm:px-4 py-1 sm:py-4 mt-2 sm:mt-0 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {task.deadline ? format(new Date(task.deadline), "MMM d, yyyy") : "No deadline"}
                          {isOverdue && <AlertTriangle className="size-3.5" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Display Component for Pragya Data
export function PragyaStatsView({ stats, schedule }: { stats?: any, schedule?: any[] }) {
  if (!stats && (!schedule || schedule.length === 0)) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {stats && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-3 border-b mb-3 border-amber-100 dark:border-amber-900/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-5 text-amber-500" />
              My Stats (Live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center border border-amber-100 dark:border-amber-900/50">
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">Total Classes</div>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-500 mt-1">{stats.total_classes || 0}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 text-center border border-amber-100 dark:border-amber-900/50">
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">Total Hours</div>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-500 mt-1">{stats.total_hours || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {schedule && schedule.length > 0 && (
        <Card className="border-cyan-200 dark:border-cyan-900/50">
          <CardHeader className="pb-3 border-b mb-3 border-cyan-100 dark:border-cyan-900/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-5 text-cyan-500" />
              Upcoming Schedule (Live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedule.slice(0, 5).map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <div className="font-medium text-sm text-cyan-800 dark:text-cyan-400">{s.title || s.topic || 'Class'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.date || s.start_time} - Room: {s.room || 'TBD'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const RoleHierarchyNode = ({ role, allRoles, allStaff, depth = 0, currentUser }: { role: any, allRoles: any[], allStaff: any[], depth?: number, currentUser?: any }) => {
  const children = allRoles.filter(r => r.parent_role_id === role.id);
  const myStaff = allStaff.filter(s => s.role_name === role.name || s.role_name === role.role);
  
  const hasOverride = currentUser?.role === "MANAGER";
  const myLevel = currentUser?.hierarchyLevel || 4;
  
  return (
    <div className="flex flex-col">
      <div 
        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex flex-col gap-2 border-l-2"
        style={{ 
          marginLeft: `${depth * 16}px`, 
          borderLeftColor: depth === 0 ? 'transparent' : '#e2e8f0',
          marginTop: depth > 0 ? '4px' : '0'
        }}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {depth > 0 && <span className="text-slate-300 font-mono">└─</span>}
            <span className="font-medium text-sm text-slate-900 dark:text-slate-200">
              {role.name || role.role}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
            Lvl {role.hierarchy_level || '?'}
          </span>
        </div>
        {role.description && (
          <span className="text-xs text-slate-500 line-clamp-1" style={{ marginLeft: depth > 0 ? '24px' : '0' }}>{role.description}</span>
        )}
        
        {/* Render Staff Members directly under the role */}
        {myStaff.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1" style={{ marginLeft: depth > 0 ? '24px' : '0' }}>
            {myStaff.map(staff => (
              <div key={staff.id} className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full px-2 py-1 shadow-sm">
                {staff.profile ? (
                  <img src={staff.profile} alt={staff.name} className="w-4 h-4 rounded-full" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-[8px] flex items-center justify-center font-bold text-indigo-700">
                    {staff.name?.charAt(0)}
                  </div>
                )}
                <span className="text-[10px] font-medium truncate max-w-[100px]">{staff.name || staff.fname + ' ' + staff.lname}</span>
                
                {/* Authorization: Show Assign Task if SuperAdmin OR if user is Senior to this staff */}
                {(hasOverride || myLevel < role.hierarchy_level) && (
                  <Link href={`/tasks/new?assignee=${staff.id}`}>
                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                      <Plus className="size-3" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {children.length > 0 && (
        <div className="flex flex-col">
          {children.map(child => (
            <RoleHierarchyNode key={child.id} role={child} allRoles={allRoles} allStaff={allStaff} depth={depth + 1} currentUser={currentUser} />
          ))}
        </div>
      )}
    </div>
  );
};

async function PragyaIntegrationSuspenseWrapper({ token, currentUser }: { token: string | undefined, currentUser?: any }) {
  let pragyaDepartments: any[] = [];
  let pragyaStats: any = null;
  let pragyaSchedule: any[] = [];
  let pragyaProfile: any = null;
  let pragyaRole: any = null;
  let pragyaStaff: any[] = [];

  try {
    if (token) {
      const apiPromises = [
        fetchPragyaAPI('departments'),
        fetchPragyaAPI('stats', token),
        fetchPragyaAPI('schedule', token),
        fetchPragyaAPI('get-profile', token),
        fetchPragyaAPI('my-role', token)
      ];
      const results = await Promise.all(apiPromises);
      pragyaDepartments = results[0]?.status ? results[0].data : [];
      pragyaStats = results[1]?.status ? results[1].data : null;
      pragyaSchedule = results[2]?.status ? results[2].data : [];
      pragyaProfile = results[3]?.status ? results[3].data : results[3];
      const roleRes = results[4];
      if (roleRes && roleRes.status) pragyaRole = roleRes.data;

      const staffRes = await fetchPragyaAPI('staff', token);
      if (staffRes && staffRes.status && staffRes.data) {
        pragyaStaff = staffRes.data;
      }
    }
  } catch (error) {
    console.error("Error fetching Pragya API data:", error);
  }

  return (
    <div className="space-y-6 mt-6 fade-in">
      {pragyaDepartments && pragyaDepartments.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardHeader className="pb-3 border-b mb-3 border-emerald-100 dark:border-emerald-900/50">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-5 text-emerald-500" />
              Departments (Live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {pragyaDepartments.map((d: any) => (
                <div key={d.id} className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                  <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate">{d.name}</div>
                  <div className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-1 font-mono">{d.code}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <PragyaStatsView stats={pragyaStats} schedule={pragyaSchedule} />
      

         {/* ── VISUAL DEPARTMENTS & ROLES VIEWER ── */}
      {pragyaDepartments && pragyaDepartments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building className="size-5 text-indigo-500" />
            Complete Organizational Hierarchy
          </h3>
          <div className="flex flex-col gap-4">
            {[
              { level: 1, name: 'Head / Manager', color: 'bg-emerald-600' },
              { level: 2, name: 'Lead / Senior', color: 'bg-blue-600' },
              { level: 3, name: 'Staff / Executive', color: 'bg-indigo-600' },
              { level: 4, name: 'Sub-role / Intern', color: 'bg-amber-600' }
            ].map(levelObj => (
              <details key={levelObj.level} className="group border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950" open={levelObj.level === 1}>
                <summary className="bg-slate-50 dark:bg-slate-900 p-4 font-bold text-lg cursor-pointer flex justify-between items-center list-none outline-none select-none">
                  <div className="flex items-center gap-3">
                    <span className={`${levelObj.color} text-white w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-sm`}>
                      {levelObj.level}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">{levelObj.name}</span>
                  </div>
                  <ChevronDown className="size-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                </summary>
                
                <div className="p-4 flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800">
                  {pragyaDepartments.map((dept: any) => {
                    const rolesInLevel = dept.roles ? dept.roles.filter((r: any) => r.hierarchy_level === levelObj.level) : [];
                    
                    return (
                      <div key={dept.id} className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
                        <div className="bg-slate-100/50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{dept.name}</span>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400 font-mono font-bold">{dept.code}</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {rolesInLevel.length > 0 ? (
                            rolesInLevel.map((role: any) => (
                              <RoleHierarchyNode key={role.id} role={role} allRoles={dept.roles} allStaff={pragyaStaff} currentUser={currentUser} />
                            ))
                          ) : (
                            <div className="p-4 text-xs text-slate-400 italic text-center bg-slate-50/30 dark:bg-slate-900/10">
                              No roles assigned at this level
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function PragyaLoadingFallback() {
  return (
    <div className="space-y-6 mt-6 fade-in">
      <Card className="border-emerald-200 dark:border-emerald-900/50 opacity-50">
        <CardHeader className="pb-3 border-b mb-3 border-emerald-100 dark:border-emerald-900/50">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-5 text-emerald-500" />
            Loading Live Departments...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 w-full bg-emerald-50 dark:bg-emerald-950/30 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="border-amber-200 dark:border-amber-900/50 opacity-50 h-32 animate-pulse"></Card>
         <Card className="border-cyan-200 dark:border-cyan-900/50 opacity-50 h-32 animate-pulse"></Card>
      </div>
    </div>
  )
}

export function PragyaLiveIntegration({ token, currentUser }: { token: string | undefined, currentUser?: any }) {
  return (
    <Suspense fallback={<PragyaLoadingFallback />}>
      <PragyaIntegrationSuspenseWrapper token={token} currentUser={currentUser} />
    </Suspense>
  )
}
