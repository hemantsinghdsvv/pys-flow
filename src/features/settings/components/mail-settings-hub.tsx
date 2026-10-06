"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Clock,
  Settings,
  ShieldCheck,
  Smartphone,
  Monitor,
  Edit3,
  Building2,
  Loader2,
  Search,
  ExternalLink,
  Info,
  Zap,
  Check,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  type MailSettingsData,
  verifySmtpConnectionAction,
  sendTestEmail,
  sendTemplateSampleAction,
  saveEmailTemplateOverrideAction,
  resetEmailTemplateOverrideAction,
  toggleGlobalRemindersAction,
  updateReminderSetting,
} from "@/features/settings/actions";
import { HolidaysPanel } from "./holidays-panel";
import { TaxonomyPanel } from "./taxonomy-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NotificationType } from "@prisma/client";

export function MailSettingsHub({ data }: { data: MailSettingsData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("templates");

  // Global reminders master state
  const [remindersEnabled, setRemindersEnabled] = useState(
    data.globalRemindersEnabled
  );
  const [togglingReminders, startTogglingReminders] = useTransition();

  // SMTP test state
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, startSendingTest] = useTransition();
  const [verifyingSmtp, startVerifyingSmtp] = useTransition();

  // Quick card test state
  const [quickSendingType, setQuickSendingType] = useState<string | null>(null);

  // Template inspection & preview modal state
  const [selectedTemplate, setSelectedTemplate] = useState<
    MailSettingsData["templates"][number] | null
  >(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [viewMode, setViewMode] = useState<"preview" | "customize">("preview");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [savingTemplate, startSavingTemplate] = useTransition();
  const [sendingSample, startSendingSample] = useTransition();

  // Search & category filter for templates
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    "All",
    "Operational Tasks",
    "Reviews & Submissions",
    "Daily Workflow & Reminders",
    "System & Notices",
  ];

  const filteredTemplates = data.templates.filter((tpl) => {
    const matchesCategory =
      selectedCategory === "All" || tpl.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tpl.name.toLowerCase().includes(q) ||
      tpl.defaultSubject.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.key.toLowerCase().includes(q) ||
      tpl.badge.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  function handleOpenPreview(tpl: MailSettingsData["templates"][number]) {
    setSelectedTemplate(tpl);
    setCustomSubject(tpl.customSubject ?? tpl.defaultSubject);
    setCustomBody(tpl.customBody ?? "");
    setViewMode("preview");
  }

  function handleVerifySmtp() {
    startVerifyingSmtp(async () => {
      try {
        const res = await verifySmtpConnectionAction();
        if (res.ok) {
          toast.success("SMTP connection verified successfully! Ready to deliver emails.");
        } else {
          toast.error(res.error || "SMTP verification failed. Check server credentials.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "SMTP verification failed.");
      }
    });
  }

  function handleSendTestEmail(recipient?: string) {
    const target = (recipient ?? testEmailAddress).trim() || data.currentUser.email;
    startSendingTest(async () => {
      try {
        const res = await sendTestEmail(target);
        if (res.sent) {
          toast.success(`Test email dispatched to ${target}!`);
        } else {
          toast.error(res.reason || "Failed to dispatch test email.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to dispatch test email.");
      }
    });
  }

  function handleQuickSendTemplate(type: NotificationType) {
    setQuickSendingType(type);
    const target = testEmailAddress.trim() || data.currentUser.email;
    sendTemplateSampleAction(type, target)
      .then((res) => {
        if (res.sent) {
          toast.success(`Template sample dispatched to ${target}!`);
        } else {
          toast.error(res.reason || "Failed to send template sample.");
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to send sample.");
      })
      .finally(() => {
        setQuickSendingType(null);
      });
  }

  function handleToggleGlobalReminders(checked: boolean) {
    startTogglingReminders(async () => {
      try {
        await toggleGlobalRemindersAction(checked);
        setRemindersEnabled(checked);
        toast.success(
          checked
            ? "Automated email reminders enabled."
            : "Automated email reminders disabled."
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to toggle reminders.");
      }
    });
  }

  function handleSendSampleFromModal() {
    if (!selectedTemplate) return;
    const target = testEmailAddress.trim() || data.currentUser.email;
    startSendingSample(async () => {
      try {
        const res = await sendTemplateSampleAction(selectedTemplate.type, target);
        if (res.sent) {
          toast.success(
            `Live sample for "${selectedTemplate.name}" dispatched to ${target}!`
          );
        } else {
          toast.error(res.reason || "Failed to send template sample.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send sample.");
      }
    });
  }

  function handleSaveTemplateOverride() {
    if (!selectedTemplate) return;
    if (!customSubject.trim() || !customBody.trim()) {
      toast.error("Both subject and body are required for a custom template override.");
      return;
    }
    startSavingTemplate(async () => {
      try {
        await saveEmailTemplateOverrideAction({
          key: selectedTemplate.key,
          subject: customSubject,
          body: customBody,
        });
        toast.success(`Custom template for "${selectedTemplate.name}" saved!`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save template override.");
      }
    });
  }

  function handleResetTemplateOverride() {
    if (!selectedTemplate) return;
    startSavingTemplate(async () => {
      try {
        await resetEmailTemplateOverrideAction({ key: selectedTemplate.key });
        toast.success(`Template "${selectedTemplate.name}" reset to PYS branded default.`);
        setCustomSubject(selectedTemplate.defaultSubject);
        setCustomBody("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to reset template.");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2">
      {/* Settings Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#00381F] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#D9AE29] shadow-xs">
              {data.companyName}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              · Operations & Communications Hub
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1.5">
            Settings & Communication Control
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Branded email templates, automated reminder schedules, outbound Brevo SMTP relay, and studio taxonomies.
          </p>
        </div>

        {/* Global Reminders Master Switch Card */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card/90 p-3.5 shadow-xs backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`size-3 rounded-full shrink-0 transition-colors ${
                remindersEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500"
              }`}
            />
            <div className="text-left leading-tight">
              <p className="text-xs font-semibold text-foreground">
                Email Reminders: {remindersEnabled ? "Active" : "Disabled"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {remindersEnabled ? "Automated cron dispatch on" : "All automated nudges paused"}
              </p>
            </div>
          </div>
          <Switch
            checked={remindersEnabled}
            disabled={togglingReminders}
            onCheckedChange={handleToggleGlobalReminders}
            aria-label="Toggle automated mail reminders"
          />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <TabsList className="inline-flex h-auto p-1.5 bg-muted/50 border border-border/60 rounded-2xl gap-1">
            <TabsTrigger
              value="templates"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-[#00381F] data-[state=active]:shadow-xs"
            >
              <Eye className="size-4 text-[#D9AE29]" />
              <span>Email Templates</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                {data.templates.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="reminders"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-[#00381F] data-[state=active]:shadow-xs"
            >
              <Clock className="size-4 text-[#00381F]" />
              <span>Reminders & Schedule</span>
              <span className={`size-2 rounded-full ${remindersEnabled ? "bg-emerald-500" : "bg-amber-500"}`} />
            </TabsTrigger>

            <TabsTrigger
              value="smtp"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-[#00381F] data-[state=active]:shadow-xs"
            >
              <Mail className="size-4 text-[#00381F]" />
              <span>SMTP Server Health</span>
              <span
                className={`size-2 rounded-full ${
                  data.smtp.isConfigured ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </TabsTrigger>

            <TabsTrigger
              value="logs"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-[#00381F] data-[state=active]:shadow-xs"
            >
              <Bell className="size-4 text-[#00381F]" />
              <span>Notification Log</span>
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                {data.recentNotifications.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="organization"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-[#00381F] data-[state=active]:shadow-xs"
            >
              <Building2 className="size-4 text-[#00381F]" />
              <span>Holidays & Departments</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: EMAIL TEMPLATES DIRECTORY & LIVE PREVIEWS
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold text-foreground">
                Official Email Templates ({data.templates.length})
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                All templates rendered with Pragya Yog School Deep Emerald branding, responsive mobile layout, and live data.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search templates or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const count =
                cat === "All"
                  ? data.templates.length
                  : data.templates.filter((t) => t.category === cat).length;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full text-xs transition-all h-7 px-3 ${
                    selectedCategory === cat
                      ? "bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B] shadow-xs"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat} ({count})
                </Button>
              );
            })}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => (
              <Card
                key={tpl.key}
                className="group flex flex-col justify-between border-border/80 hover:border-[#D9AE29] transition-all duration-200 hover:shadow-md bg-card overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block rounded-full border border-[#DFD7C7] bg-[#F5EFE5] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#00381F]">
                      {tpl.badge}
                    </span>
                    {tpl.hasOverride ? (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-900 border-amber-300">
                        Custom Override
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                        PYS Branded
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-serif text-lg font-semibold text-foreground group-hover:text-[#00381F] transition-colors leading-tight">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {tpl.description}
                    </p>
                  </div>

                  {/* Subject Line Preview */}
                  <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1 border border-border/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                      <Mail className="size-3 text-[#D9AE29]" />
                      <span>Subject line:</span>
                    </div>
                    <p className="font-medium text-foreground truncate text-xs">
                      {tpl.customSubject ?? tpl.defaultSubject} · Pragya Yog School
                    </p>
                  </div>

                  {/* Dynamic Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tpl.supportedVariables.map((v) => (
                      <span
                        key={v}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickSendTemplate(tpl.type)}
                    disabled={quickSendingType === tpl.type}
                    className="flex-1 text-xs h-8 gap-1.5 border-border/70 hover:bg-muted"
                  >
                    {quickSendingType === tpl.type ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Send className="size-3 text-[#00381F]" />
                    )}
                    Send Test
                  </Button>

                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleOpenPreview(tpl)}
                    className="flex-1 bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B] text-xs h-8 gap-1.5 shadow-xs"
                  >
                    <Eye className="size-3.5 text-[#D9AE29]" />
                    Preview & Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/40">
              <Mail className="size-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-semibold">No email templates match your filter.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching with different keywords or select "All".
              </p>
            </div>
          )}
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: REMINDERS & AUTOMATED SCHEDULES
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="reminders" className="space-y-6 focus-visible:outline-none">
          {/* Master Reminders Alert Banner */}
          <div
            className={`rounded-2xl border p-5 transition-all shadow-xs ${
              remindersEnabled
                ? "border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/25"
                : "border-amber-300 bg-amber-50/70 dark:bg-amber-950/25"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`size-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    remindersEnabled ? "bg-[#00381F] text-[#D9AE29]" : "bg-amber-600 text-white"
                  }`}
                >
                  <Clock className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    Automated Email Reminders:{" "}
                    <span className={remindersEnabled ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                      {remindersEnabled ? "ACTIVE" : "DISABLED"}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
                    {remindersEnabled
                      ? "Automated emails for morning login, midday work logs, end-of-day submissions, and daily reports are scheduled according to the Hong Kong Time (HKT) intervals below."
                      : "Automated reminders are currently suppressed. No student or staff member receives automated nudge emails. Toggle this switch whenever you wish to resume automated reminders."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold">
                  {remindersEnabled ? "Master Active" : "Master Paused"}
                </span>
                <Switch
                  checked={remindersEnabled}
                  disabled={togglingReminders}
                  onCheckedChange={handleToggleGlobalReminders}
                />
              </div>
            </div>
          </div>

          {/* Reminder Schedules Table */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-xl">Daily Workflow Automated Schedules</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    Configure schedule timing (HKT) and individual switches for each operational reminder.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Timezone: HKT (UTC+8)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {data.reminders.map((r) => (
                  <ReminderScheduleRow
                    key={r.key}
                    reminder={r}
                    globalEnabled={remindersEnabled}
                    userEmail={data.currentUser.email}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: SMTP SERVER HEALTH & TEST TOOLS
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="smtp" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Card */}
            <Card className="md:col-span-2 border-border/80 shadow-xs">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-[#00381F]/10 p-2 text-[#00381F]">
                      <Mail className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-xl">Outbound SMTP Relay Server</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Active Brevo transactional relay credentials and connection parameters.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={data.smtp.isConfigured ? "default" : "destructive"}
                    className={data.smtp.isConfigured ? "bg-emerald-600 text-white" : ""}
                  >
                    {data.smtp.isConfigured ? "Configured & Operational" : "Not Configured"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Relay Host</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{data.smtp.host}</p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Port & TLS</p>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      Port {data.smtp.port} (STARTTLS)
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">From Address</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      Pragya Yog School &lt;{data.smtp.from}&gt;
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Username</p>
                    <p className="text-sm font-mono text-foreground truncate">{data.smtp.user}</p>
                  </div>
                </div>

                {/* Dev Mode Redirect Warning */}
                {data.smtp.devOverride && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold">Development Mail Redirection Safe Mode</p>
                      <p className="leading-relaxed">
                        All outgoing emails are redirected to{" "}
                        <span className="font-mono font-bold">{data.smtp.devOverride}</span>. Inboxes of real trainees and staff will not be spammed during testing.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={handleVerifySmtp}
                    disabled={verifyingSmtp}
                    className="gap-2 text-xs h-9 border-border/80 hover:bg-muted"
                  >
                    {verifyingSmtp ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4 text-emerald-600" />
                    )}
                    Verify SMTP Connection Handshake
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Test Sender Form */}
            <Card className="border-border/80 shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="font-serif text-lg">Send Live Test Email</CardTitle>
                <CardDescription className="text-xs">
                  Verify end-to-end inbox delivery with a live test message.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Target Recipient
                  </label>
                  <Input
                    type="email"
                    placeholder={data.currentUser.email}
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="text-xs bg-card"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Defaults to your signed-in address: <span className="font-mono">{data.currentUser.email}</span>
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => handleSendTestEmail()}
                    disabled={sendingTest}
                    className="w-full bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B] gap-2 text-xs h-9 shadow-xs"
                  >
                    {sendingTest ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-3.5 text-[#D9AE29]" />
                    )}
                    Send Test to {testEmailAddress ? testEmailAddress : "My Inbox"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: RECENT NOTIFICATION DELIVERY LOG
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-6 focus-visible:outline-none">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-serif text-xl">Recent Notification Audit Log</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    Live database records of the latest 20 notifications dispatched to users.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {data.recentNotifications.length} Events Logged
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentNotifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Bell className="size-8 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-semibold">No notifications recorded in database yet.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New notifications dispatched to users will automatically be audited here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-xs font-semibold">Recipient</TableHead>
                        <TableHead className="text-xs font-semibold">Type</TableHead>
                        <TableHead className="text-xs font-semibold">Title & Details</TableHead>
                        <TableHead className="text-xs font-semibold">Dispatched At</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentNotifications.map((n) => (
                        <TableRow key={n.id} className="hover:bg-muted/30">
                          <TableCell className="py-3">
                            <p className="text-xs font-semibold text-foreground">{n.userName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{n.userEmail}</p>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {n.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 max-w-xs">
                            <p className="text-xs font-medium text-foreground">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{n.message}</p>
                          </TableCell>
                          <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="py-3">
                            {n.isRead ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                <Check className="size-3" /> Read
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-600 font-medium">Unread</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            {n.link ? (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Link href={n.link} target="_blank">
                                  <ExternalLink className="size-3 mr-1" /> View
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: HOLIDAYS & TAXONOMIES
        ───────────────────────────────────────────────────────────── */}
        <TabsContent value="organization" className="space-y-6 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="font-serif text-lg">Official Holidays</CardTitle>
                <CardDescription className="text-xs">
                  Dates marked as holidays automatically pause reminder dispatches and attendance absence penalties.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <HolidaysPanel holidays={data.holidays} />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="font-serif text-lg">Studio Departments</CardTitle>
                <CardDescription className="text-xs">
                  Operational departments and tracking codes across Pragya Yog School.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <TaxonomyPanel
                  kind="department"
                  items={data.departments}
                  namePlaceholder="Department name (e.g. Teacher Training)"
                  extraPlaceholder="Code (e.g. YTT)"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─────────────────────────────────────────────────────────────
          LIVE TEMPLATE INSPECTION & PREVIEW MODAL
      ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={selectedTemplate !== null}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      >
        <DialogContent className="sm:max-w-4xl max-w-4xl w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden border-border/80 shadow-2xl">
          {selectedTemplate && (
            <>
              {/* Modal Header */}
              <div className="border-b border-border/80 bg-[#00381F] p-4 text-[#F5EFE5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/10 p-2 text-[#D9AE29] shadow-xs">
                    <Eye className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#D9AE29] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00381F]">
                        {selectedTemplate.badge}
                      </span>
                      <span className="text-xs text-white/70 font-mono">
                        key: {selectedTemplate.key}
                      </span>
                    </div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-white mt-0.5">
                      {selectedTemplate.name}
                    </h2>
                  </div>
                </div>

                {/* Desktop / Mobile view toggle & Customize switcher */}
                <div className="flex items-center gap-2 pr-10">
                  {viewMode === "preview" && (
                    <div className="hidden sm:flex items-center rounded-xl bg-black/30 p-1 border border-white/10">
                      <Button
                        size="sm"
                        variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                        onClick={() => setPreviewDevice("desktop")}
                        className="h-7 px-2.5 text-xs text-white"
                      >
                        <Monitor className="size-3 mr-1" /> Desktop
                      </Button>
                      <Button
                        size="sm"
                        variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                        onClick={() => setPreviewDevice("mobile")}
                        className="h-7 px-2.5 text-xs text-white"
                      >
                        <Smartphone className="size-3 mr-1" /> Mobile
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setViewMode(viewMode === "preview" ? "customize" : "preview")
                    }
                    className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs gap-1.5"
                  >
                    <Edit3 className="size-3.5" />
                    {viewMode === "preview" ? "Customize Template" : "Back to Preview"}
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/20">
                {viewMode === "preview" ? (
                  <>
                    {/* Subject Line Bar */}
                    <div className="rounded-xl border border-border bg-card p-3 text-xs flex items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-semibold text-muted-foreground shrink-0">Subject:</span>
                        <span className="font-semibold text-foreground truncate">
                          {selectedTemplate.previewSubject}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-border/80">
                        Brand Layout · Pragya Yog School
                      </Badge>
                    </div>

                    {/* Insulated Email HTML Preview Container */}
                    <div className="flex justify-center py-2">
                      <div
                        className={`transition-all duration-300 rounded-2xl overflow-hidden shadow-lg border border-border bg-[#F5EFE5] ${
                          previewDevice === "desktop"
                            ? "w-[620px] max-w-full"
                            : "w-[380px]"
                        }`}
                        style={{ height: "500px" }}
                      >
                        <iframe
                          title="Email Preview"
                          srcDoc={selectedTemplate.previewHtml}
                          className="w-full h-full border-0"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* Customization Form */
                  <div className="space-y-4 bg-card rounded-2xl p-5 border border-border shadow-xs">
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-foreground">
                        Customize Template Override
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customize subject and HTML body. Supported placeholders:{" "}
                        <code className="text-[#944426] font-mono">
                          &#123;&#123;name&#125;&#125;, &#123;&#123;title&#125;&#125;, &#123;&#123;message&#125;&#125;, &#123;&#123;link&#125;&#125;, &#123;&#123;action&#125;&#125;
                        </code>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Custom Subject Line
                      </label>
                      <Input
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="e.g. Important Task: {{title}}"
                        className="text-xs bg-muted/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Custom HTML / Text Body Template
                      </label>
                      <Textarea
                        rows={10}
                        value={customBody}
                        onChange={(e) => setCustomBody(e.target.value)}
                        placeholder="<p>Hi {{name}},</p><p>{{message}}</p><a href='{{link}}'>{{action}}</a>"
                        className="font-mono text-xs bg-muted/20"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={savingTemplate || !selectedTemplate.hasOverride}
                        onClick={handleResetTemplateOverride}
                        className="text-xs"
                      >
                        Reset to PYS Branded Default
                      </Button>

                      <Button
                        size="sm"
                        disabled={savingTemplate}
                        onClick={handleSaveTemplateOverride}
                        className="bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B] text-xs shadow-xs"
                      >
                        {savingTemplate && (
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        )}
                        Save Template Override
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-border bg-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="size-4 text-[#D9AE29]" />
                  <span>
                    Preview recipient: <span className="font-semibold text-foreground">{data.currentUser.name}</span> ({data.currentUser.email})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTemplate(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSendSampleFromModal}
                    disabled={sendingSample}
                    className="bg-[#00381F] text-[#F5EFE5] hover:bg-[#0A4A2B] text-xs gap-1.5 shadow-xs"
                  >
                    {sendingSample ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5 text-[#D9AE29]" />
                    )}
                    Send Sample to {data.currentUser.email}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-component: Individual Reminder Schedule Row
// ─────────────────────────────────────────────────────────────
function ReminderScheduleRow({
  reminder,
  globalEnabled,
  userEmail,
}: {
  reminder: MailSettingsData["reminders"][number];
  globalEnabled: boolean;
  userEmail: string;
}) {
  const router = useRouter();
  const [hour, setHour] = useState(reminder.hour);
  const [minute, setMinute] = useState(reminder.minute);
  const [enabled, setEnabled] = useState(reminder.enabled);
  const [pending, startTransition] = useTransition();
  const [testing, startTesting] = useTransition();

  function save(next: { hour?: number; minute?: number; enabled?: boolean }) {
    const payload = {
      key: reminder.key,
      hour: next.hour ?? hour,
      minute: next.minute ?? minute,
      enabled: next.enabled ?? enabled,
    };
    startTransition(async () => {
      try {
        await updateReminderSetting(payload);
        toast.success(`Updated schedule for ${reminder.label}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update reminder");
      }
    });
  }

  function handleTestReminder() {
    startTesting(async () => {
      try {
        // Map reminder key to corresponding template notification type
        const typeMap: Record<string, NotificationType> = {
          login_reminder: "LOGIN_REMINDER",
          worklog_reminder: "WORK_LOG_REMINDER",
          submission_reminder: "SUBMISSION_REMINDER",
          daily_reminder: "DAILY_REMINDER",
          task_reminder: "TASK_REMINDER",
          deadline_reminder: "DEADLINE_REMINDER",
        };
        const type = typeMap[reminder.key] || "LOGIN_REMINDER";
        const res = await sendTemplateSampleAction(type, userEmail);
        if (res.sent) {
          toast.success(`Sample reminder for "${reminder.label}" sent to ${userEmail}!`);
        } else {
          toast.error(res.reason || "Failed to dispatch test reminder.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to test reminder.");
      }
    });
  }

  // Format with leading zero
  const displayHour = String(hour).padStart(2, "0");
  const displayMinute = String(minute).padStart(2, "0");

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Switch
            checked={enabled}
            disabled={pending || !globalEnabled}
            onCheckedChange={(v) => {
              setEnabled(v);
              save({ enabled: v });
            }}
          />
          <span className="font-serif text-base font-semibold text-foreground">
            {reminder.label}
          </span>
          {!globalEnabled && (
            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
              Master paused
            </Badge>
          )}
          {enabled && globalEnabled && (
            <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
              Active at {displayHour}:{displayMinute} HKT
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground pl-11 max-w-xl leading-relaxed">
          {reminder.description}
        </p>
      </div>

      <div className="flex items-center gap-2 pl-11 sm:pl-0 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground">Time (HKT):</span>
        <Input
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => {
            const val = Math.max(0, Math.min(23, Number(e.target.value)));
            setHour(val);
          }}
          className="w-16 h-8 text-xs font-mono bg-card"
          aria-label="Hour"
        />
        <span className="text-muted-foreground font-bold">:</span>
        <Input
          type="number"
          min={0}
          max={59}
          value={minute}
          onChange={(e) => {
            const val = Math.max(0, Math.min(59, Number(e.target.value)));
            setMinute(val);
          }}
          className="w-16 h-8 text-xs font-mono bg-card"
          aria-label="Minute"
        />

        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => save({})}
          className="h-8 text-xs ml-1"
        >
          {pending ? <Loader2 className="size-3 animate-spin mr-1" /> : <Check className="size-3 mr-1" />}
          Save
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={testing}
          onClick={handleTestReminder}
          title="Send sample reminder to my email"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {testing ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3 text-[#00381F]" />}
        </Button>
      </div>
    </div>
  );
}
