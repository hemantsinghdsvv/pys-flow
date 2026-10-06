import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Production Vercel domain used for email action and portal links (never localhost)
const APP_URL = (() => {
  const custom = process.env.EMAIL_APP_URL?.trim();
  if (custom) return custom;
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  return "https://pys-flow.vercel.app";
})();

/** Per-notification-type email metadata tailored for Pragya Yog School (PYS Flow). */
const TYPE_META: Record<
  NotificationType,
  { subject: string; action: string; badge: string; key: string }
> = {
  DAILY_REMINDER: {
    subject: "Submit your daily report",
    action: "Log Today's Work",
    badge: "Daily Report",
    key: "daily_reminder",
  },
  TASK_ASSIGNED: {
    subject: "A task was assigned to you",
    action: "View Task",
    badge: "Task Assignment",
    key: "task_assigned",
  },
  TASK_REMINDER: {
    subject: "Task reminder",
    action: "View Task",
    badge: "Reminder",
    key: "task_reminder",
  },
  REVIEW_REQUESTED: {
    subject: "Work is ready for your review",
    action: "Open Review Queue",
    badge: "Review Request",
    key: "review_requested",
  },
  REVIEW_COMPLETED: {
    subject: "Your work was reviewed",
    action: "View Feedback",
    badge: "Review Completed",
    key: "review_completed",
  },
  DEADLINE_REMINDER: {
    subject: "Upcoming deadline reminder",
    action: "View Task",
    badge: "Deadline Notice",
    key: "deadline_reminder",
  },
  MISSED_REPORT: {
    subject: "Missed daily report",
    action: "Submit Report",
    badge: "Attendance Notice",
    key: "missed_report",
  },
  INACTIVE_ALERT: {
    subject: "Activity update required",
    action: "Open PYS Flow",
    badge: "Account Notice",
    key: "inactive_alert",
  },
  GENERAL: {
    subject: "PYS Flow notification",
    action: "Open PYS Flow",
    badge: "Notification",
    key: "general",
  },
  SYSTEM: {
    subject: "PYS Flow system notice",
    action: "Open PYS Flow",
    badge: "System Notice",
    key: "system",
  },
  // Daily workflow
  LOGIN_REMINDER: {
    subject: "Good morning — please login and acknowledge tasks",
    action: "Go to Dashboard",
    badge: "Morning Check-In",
    key: "login_reminder",
  },
  WORK_LOG_REMINDER: {
    subject: "Please update your daily work log",
    action: "Update Work Log",
    badge: "Work Log Update",
    key: "worklog_reminder",
  },
  SUBMISSION_REMINDER: {
    subject: "Please submit today's work report",
    action: "Submit Report",
    badge: "End of Day Report",
    key: "submission_reminder",
  },
  SUBMISSION_CONFIRMED: {
    subject: "Daily report submitted successfully",
    action: "View Report",
    badge: "Report Received",
    key: "submission_confirmed",
  },
  TASK_APPROVAL_REQUESTED: {
    subject: "Task pending your approval",
    action: "Review Task",
    badge: "Approval Required",
    key: "task_approval_requested",
  },
  TASK_APPROVED: {
    subject: "Your task was approved",
    action: "View Task",
    badge: "Task Approved",
    key: "task_approved",
  },
  TASK_DECLINED: {
    subject: "Your task was declined",
    action: "View Task",
    badge: "Task Declined",
    key: "task_declined",
  },
};

export type EmailContent = { subject: string; html: string };

export type TemplateCategory =
  | "Operational Tasks"
  | "Reviews & Submissions"
  | "Daily Workflow & Reminders"
  | "System & Notices";

export type TemplateInfo = {
  type: NotificationType;
  key: string;
  name: string;
  badge: string;
  category: TemplateCategory;
  defaultSubject: string;
  actionLabel: string;
  description: string;
  sampleData: {
    title: string;
    message: string;
    recipientName: string;
    link: string;
  };
  supportedVariables: string[];
};

export const EMAIL_TEMPLATE_CATALOG: TemplateInfo[] = [
  // ── Operational Tasks ──
  {
    type: "TASK_ASSIGNED",
    key: "task_assigned",
    name: "Task Assignment",
    badge: "Task Assignment",
    category: "Operational Tasks",
    defaultSubject: "A task was assigned to you",
    actionLabel: "View Task",
    description: "Sent to staff, instructors, or trainees when a new task is created and assigned to them.",
    sampleData: {
      title: "New task assigned: Studio Equipment Check & Prop Audit",
      message: "You have been assigned to 'Studio Equipment Check & Prop Audit' for Central Studio. Please review the checklist, milestones, and deliverables.",
      recipientName: "Aarya Kuldeep",
      link: "/tasks",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "TASK_APPROVAL_REQUESTED",
    key: "task_approval_requested",
    name: "Task Approval Requested",
    badge: "Approval Required",
    category: "Operational Tasks",
    defaultSubject: "Task pending your approval",
    actionLabel: "Review Task",
    description: "Sent to studio leads and coordinators when a member completes a task and requests verification.",
    sampleData: {
      title: "Task submitted for approval: Yin Yoga Workshop Curriculum",
      message: "A team member has marked 'Yin Yoga Workshop Curriculum' as ready for review. Please inspect the attached deliverables and grant sign-off.",
      recipientName: "Aarya Kuldeep",
      link: "/tasks",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "TASK_APPROVED",
    key: "task_approved",
    name: "Task Approved",
    badge: "Task Approved",
    category: "Operational Tasks",
    defaultSubject: "Your task was approved",
    actionLabel: "View Task",
    description: "Sent to the task assignee as soon as their deliverable is approved by a coordinator.",
    sampleData: {
      title: "Task approved: Yin Yoga Workshop Curriculum",
      message: "Great work! Your deliverable for 'Yin Yoga Workshop Curriculum' has been reviewed, approved, and marked complete in PYS Flow.",
      recipientName: "Priya Sharma",
      link: "/tasks",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "TASK_DECLINED",
    key: "task_declined",
    name: "Task Declined / Revision Needed",
    badge: "Task Declined",
    category: "Operational Tasks",
    defaultSubject: "Your task was declined",
    actionLabel: "View Task",
    description: "Sent when an approval or review requires corrections before completion.",
    sampleData: {
      title: "Revision requested: Studio Poster Design Assets",
      message: "Your task submission requires minor adjustments according to brand guidelines. Please check coordinator notes and re-submit.",
      recipientName: "Rahul Mehta",
      link: "/tasks",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "TASK_REMINDER",
    key: "task_reminder",
    name: "Task Progress Reminder",
    badge: "Reminder",
    category: "Operational Tasks",
    defaultSubject: "Task reminder",
    actionLabel: "View Task",
    description: "Periodic reminder to update progress on ongoing tasks.",
    sampleData: {
      title: "Reminder: Update progress on 'Teacher Training Handbook'",
      message: "You have an active task in progress: 'Teacher Training Handbook'. Please update status or log today's time.",
      recipientName: "Sunita Verma",
      link: "/tasks",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "DEADLINE_REMINDER",
    key: "deadline_reminder",
    name: "Upcoming Deadline Reminder",
    badge: "Deadline Notice",
    category: "Operational Tasks",
    defaultSubject: "Upcoming deadline reminder",
    actionLabel: "View Task",
    description: "Alert dispatched when a scheduled task deadline is within 24–48 hours.",
    sampleData: {
      title: "Upcoming deadline: Sheung Wan Studio Schedule Finalization",
      message: "The milestone deadline for 'Sheung Wan Studio Schedule Finalization' is tomorrow at 5:00 PM. Please ensure deliverables are ready.",
      recipientName: "Amit Joshi",
      link: "/tasks",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },

  // ── Reviews & Submissions ──
  {
    type: "REVIEW_REQUESTED",
    key: "review_requested",
    name: "Review Requested",
    badge: "Review Request",
    category: "Reviews & Submissions",
    defaultSubject: "Work is ready for your review",
    actionLabel: "Open Review Queue",
    description: "Sent to mentors and reviewers when a daily log or deliverable is submitted for rating.",
    sampleData: {
      title: "Daily work log submitted for your review",
      message: "A new accountability log with 7 hours of studio work has been submitted and is waiting in your review queue.",
      recipientName: "Aarya Kuldeep",
      link: "/reviews",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "REVIEW_COMPLETED",
    key: "review_completed",
    name: "Review Completed",
    badge: "Review Completed",
    category: "Reviews & Submissions",
    defaultSubject: "Your work was reviewed",
    actionLabel: "View Feedback",
    description: "Delivered to a team member when their log or task receives evaluator feedback.",
    sampleData: {
      title: "Your work report has been evaluated",
      message: "Your mentor has reviewed your submission from yesterday and awarded 9.5/10 with positive notes on studio coordination.",
      recipientName: "Kavita Rao",
      link: "/reviews",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "SUBMISSION_CONFIRMED",
    key: "submission_confirmed",
    name: "Report Submission Confirmed",
    badge: "Report Received",
    category: "Reviews & Submissions",
    defaultSubject: "Daily report submitted successfully",
    actionLabel: "View Report",
    description: "Receipt confirmation sent immediately after a member records their daily accountability log.",
    sampleData: {
      title: "Daily accountability report saved",
      message: "Thank you! Your daily work log has been recorded and submitted to operations for today.",
      recipientName: "Devendra Patel",
      link: "/daily-logs",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },

  // ── Daily Workflow & Reminders ──
  {
    type: "LOGIN_REMINDER",
    key: "login_reminder",
    name: "Morning Check-In / Login Reminder",
    badge: "Morning Check-In",
    category: "Daily Workflow & Reminders",
    defaultSubject: "Good morning — please login and acknowledge tasks",
    actionLabel: "Go to Dashboard",
    description: "Morning prompt sent at 9:30 AM to check in, review duties, and acknowledge tasks.",
    sampleData: {
      title: "Good morning! Please check in to PYS Flow",
      message: "Please log in to PYS Flow to acknowledge today's assigned tasks and studio schedule before 10:00 AM.",
      recipientName: "Aarya Kuldeep",
      link: "/tasks",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "WORK_LOG_REMINDER",
    key: "worklog_reminder",
    name: "Midday Work Log Reminder",
    badge: "Work Log Update",
    category: "Daily Workflow & Reminders",
    defaultSubject: "Please update your daily work log",
    actionLabel: "Update Work Log",
    description: "Afternoon prompt at 4:30 PM reminding staff/trainees to log their hours and ongoing tasks.",
    sampleData: {
      title: "Please update your daily work log",
      message: "It's 4:30 PM — please update your work log with afternoon progress and class updates.",
      recipientName: "Ananya Deshmukh",
      link: "/daily-logs/new",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "SUBMISSION_REMINDER",
    key: "submission_reminder",
    name: "End-of-Day Submission Reminder",
    badge: "End of Day Report",
    category: "Daily Workflow & Reminders",
    defaultSubject: "Please submit today's work report",
    actionLabel: "Submit Report",
    description: "Closing reminder sent at 5:30 PM for the 5:30 PM – 6:30 PM daily log submission window.",
    sampleData: {
      title: "Please submit today's work report before 6:30 PM",
      message: "The daily submission window is open. Please review your hours, learnings, and submit before 6:30 PM.",
      recipientName: "Manoj Kumar",
      link: "/daily-logs/new",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "DAILY_REMINDER",
    key: "daily_reminder",
    name: "General Daily Log Reminder",
    badge: "Daily Report",
    category: "Daily Workflow & Reminders",
    defaultSubject: "Submit your daily report",
    actionLabel: "Log Today's Work",
    description: "Sent to members who haven't logged today's progress before the end of the day.",
    sampleData: {
      title: "Submit your daily report",
      message: "Don't forget to submit today's daily accountability report before the end of your shift.",
      recipientName: "Pooja Hegde",
      link: "/daily-logs/new",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "MISSED_REPORT",
    key: "missed_report",
    name: "Missed Report / Absence Alert",
    badge: "Attendance Notice",
    category: "Daily Workflow & Reminders",
    defaultSubject: "Missed daily report",
    actionLabel: "Submit Report",
    description: "Dispatched when no log was found for a scheduled working day and the user was marked absent.",
    sampleData: {
      title: "Missed daily report notice",
      message: "You had no work report logged for yesterday and were marked absent. Please contact your coordinator.",
      recipientName: "Sanjay Singhania",
      link: "/daily-logs/new",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },

  // ── System & Notices ──
  {
    type: "INACTIVE_ALERT",
    key: "inactive_alert",
    name: "Inactive Account Alert",
    badge: "Account Notice",
    category: "System & Notices",
    defaultSubject: "Activity update required",
    actionLabel: "Open PYS Flow",
    description: "Sent when an active team member has not checked in for multiple days.",
    sampleData: {
      title: "Activity update required on PYS Flow",
      message: "We haven't received recent log updates on your account. Please log in to confirm your ongoing assignments.",
      recipientName: "Meera Nair",
      link: "/dashboard",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "GENERAL",
    key: "general",
    name: "General Announcement",
    badge: "Notification",
    category: "System & Notices",
    defaultSubject: "PYS Flow notification",
    actionLabel: "Open PYS Flow",
    description: "Sent for general team announcements, schedule releases, or event updates.",
    sampleData: {
      title: "Studio Schedule Announcement",
      message: "Next month's teacher training and masterclass rosters have been posted. Please review your dates.",
      recipientName: "All Staff",
      link: "/events",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
  {
    type: "SYSTEM",
    key: "system",
    name: "System & Maintenance Notice",
    badge: "System Notice",
    category: "System & Notices",
    defaultSubject: "PYS Flow system notice",
    actionLabel: "Open PYS Flow",
    description: "Sent for system upgrades, security updates, or SMTP configuration test emails.",
    sampleData: {
      title: "System notice: PYS Flow scheduled maintenance",
      message: "PYS Flow will undergo planned maintenance on Sunday, 2:00 AM – 4:00 AM HKT. All services will resume immediately after.",
      recipientName: "Studio Administrator",
      link: "/dashboard",
    },
    supportedVariables: ["{{name}}", "{{title}}", "{{message}}", "{{link}}", "{{action}}"],
  },
];

function layout({
  title,
  message,
  actionLabel,
  actionUrl,
  recipientName,
  badge,
}: {
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  recipientName?: string;
  badge?: string;
}): string {
  const logoUrl = "https://pyshk.com/logo.png";
  const previewSnippet = escapeHtml(message.slice(0, 120));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} · Pragya Yog School</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F5EFE5;font-family:'Neue Montreal','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:#1E1E1E;">
    <!-- Preheader preview text for email clients -->
    <div style="display:none;font-size:1px;color:#F5EFE5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
      ${previewSnippet}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5EFE5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="width:100%;max-width:580px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #DFD7C7;box-shadow:0 8px 30px rgba(0,56,31,0.06);">
            
            <!-- Brand Header Band -->
            <tr>
              <td style="background-color:#00381F;padding:22px 28px;border-bottom:3px solid #D9AE29;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="48" style="vertical-align:middle;padding-right:14px;">
                      <img src="${logoUrl}" alt="Pragya Yog School" width="44" height="44" style="display:block;border-radius:10px;background:#FFFFFF;padding:2px;border:1px solid rgba(217,174,41,0.4);" />
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="color:#FFFFFF;font-family:'Canela',Georgia,serif;font-size:18px;font-weight:600;letter-spacing:0.6px;line-height:1.2;">
                        PRAGYA YOG SCHOOL
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main Content Area -->
            <tr>
              <td style="padding:32px 32px 28px;background-color:#FFFFFF;">
                ${
                  recipientName
                    ? `<p style="margin:0 0 14px;color:#555047;font-size:15px;line-height:1.5;">Hi ${escapeHtml(recipientName)},</p>`
                    : ""
                }

                <h1 style="margin:0 0 16px;color:#00381F;font-family:'Canela',Georgia,serif;font-size:22px;font-weight:600;line-height:1.35;letter-spacing:0.2px;">
                  ${escapeHtml(title)}
                </h1>

                <div style="margin:0 0 28px;color:#1E1E1E;font-size:15px;line-height:1.65;background-color:#FAF6EF;border-left:3px solid #D9AE29;border-radius:8px;padding:16px 20px;">
                  ${escapeHtml(message)}
                </div>

                <!-- Call to action button -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
                  <tr>
                    <td align="left" style="border-radius:8px;background-color:#00381F;">
                      <a href="${actionUrl}" target="_blank" style="display:inline-block;background-color:#00381F;color:#F5EFE5;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.3px;border:1px solid #D9AE29;">
                        ${escapeHtml(actionLabel)} &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;color:#8C8275;font-size:12px;line-height:1.5;">
                  If the button does not work, visit the portal directly:<br/>
                  <a href="${actionUrl}" style="color:#944426;text-decoration:underline;word-break:break-all;">${actionUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Brand Footer Area -->
            <tr>
              <td style="padding:22px 32px;border-top:1px solid #DFD7C7;background-color:#F5EFE5;">
                <p style="margin:0 0 6px;color:#00381F;font-family:'Canela',Georgia,serif;font-size:14px;font-weight:700;letter-spacing:0.3px;">
                  Pragya Yog School
                </p>
                <p style="margin:0 0 4px;color:#555047;font-size:12px;line-height:1.6;">
                  Telephone: <a href="tel:+85267082503" style="color:#555047;text-decoration:none;">+852 6708 2503</a><br/>
                  Email: <a href="mailto:info@pyshk.com" style="color:#00381F;text-decoration:underline;">info@pyshk.com</a>
                </p>
                <p style="margin:8px 0 0;color:#8C8275;font-size:11px;line-height:1.4;">
                  &copy; 2026 Pragya Yog School. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Build the subject + HTML for a notification email. Looks up a DB
 * `EmailTemplate` override by key first (supports {{title}}, {{message}},
 * {{name}}, {{link}} placeholders), otherwise renders the built-in layout.
 */
export async function renderNotificationEmail(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  recipientName?: string;
}): Promise<EmailContent> {
  const meta = TYPE_META[params.type] ?? TYPE_META.GENERAL;
  const actionUrl = params.link
    ? `${APP_URL.replace(/\/$/, "")}${params.link.startsWith("/") ? "" : "/"}${params.link}`
    : APP_URL;

  // Optional DB-defined override.
  const override = await (prisma as any).emailTemplate
    ?.findUnique({ where: { key: meta.key } })
    ?.catch(() => null);

  if (override) {
    const vars: Record<string, string> = {
      title: params.title,
      message: params.message,
      name: params.recipientName ?? "",
      link: actionUrl,
      action: meta.action,
    };
    const subst = (s: string) =>
      s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
    return { subject: subst(override.subject), html: subst(override.body) };
  }

  return {
    subject: `${params.title} · Pragya Yog School`,
    html: layout({
      title: params.title,
      message: params.message,
      actionLabel: meta.action,
      actionUrl,
      recipientName: params.recipientName,
      badge: meta.badge,
    }),
  };
}

/**
 * Renders a full HTML preview of any template in the catalog with sample data.
 * Used by the settings UI for the live email template inspector.
 */
export function renderTemplatePreview(
  type: NotificationType,
  overrideSubject?: string,
  overrideBody?: string,
  customRecipientName?: string
): EmailContent {
  const meta = TYPE_META[type] ?? TYPE_META.GENERAL;
  const catalogItem = EMAIL_TEMPLATE_CATALOG.find((t) => t.type === type) ?? {
    sampleData: {
      title: "Notification Title",
      message: "This is a sample notification message delivered via PYS Flow.",
      recipientName: "Staff Member",
      link: "/dashboard",
    },
  };

  const recipientName = customRecipientName || catalogItem.sampleData.recipientName;
  const actionUrl = `${APP_URL.replace(/\/$/, "")}${catalogItem.sampleData.link.startsWith("/") ? "" : "/"}${catalogItem.sampleData.link}`;

  if (overrideBody && overrideBody.trim()) {
    const vars: Record<string, string> = {
      title: catalogItem.sampleData.title,
      message: catalogItem.sampleData.message,
      name: recipientName,
      link: actionUrl,
      action: meta.action,
    };
    const subst = (s: string) =>
      s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

    return {
      subject: overrideSubject ? subst(overrideSubject) : `${catalogItem.sampleData.title} · Pragya Yog School`,
      html: subst(overrideBody),
    };
  }

  return {
    subject: overrideSubject?.trim() || `${catalogItem.sampleData.title} · Pragya Yog School`,
    html: layout({
      title: catalogItem.sampleData.title,
      message: catalogItem.sampleData.message,
      actionLabel: meta.action,
      actionUrl,
      recipientName,
      badge: meta.badge,
    }),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
