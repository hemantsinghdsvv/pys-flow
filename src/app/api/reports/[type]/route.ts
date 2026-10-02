import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { requireUser, companyFilter } from "@/lib/access";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  TASK_STATUS_LABELS,
  DAILY_LOG_STATUS_LABELS,
} from "@/config/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function xlsxResponse(buffer: ArrayBuffer, filename: string) {
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const user = await requireUser();
  if (!can(user, "report:generate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const scope = await companyFilter(user);
  const { type } = await params;
  const stamp = format(new Date(), "yyyy-MM-dd");

  if (type === "students") {
    const profiles = await prisma.studentProfile.findMany({
      where: { ...scope, user: { deletedAt: null } },
      include: {
        user: { select: { name: true, email: true, isActive: true } },
        batch: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Students");
    ws.columns = [
      { header: "Name", key: "name", width: 26 },
      { header: "Email", key: "email", width: 30 },
      { header: "Roll No.", key: "roll", width: 14 },
      { header: "Department", key: "dept", width: 20 },
      { header: "Batch", key: "batch", width: 20 },
      { header: "Company", key: "company", width: 22 },
      { header: "Skills", key: "skills", width: 34 },
      { header: "Active", key: "active", width: 10 },
    ];
    ws.getRow(1).font = { bold: true };
    profiles.forEach((p) => {
      ws.addRow({
        name: p.user.name,
        email: p.user.email,
        roll: p.rollNumber ?? "",
        dept: p.department ?? "",
        batch: p.batch?.name ?? "",
        company: p.company.name,
        skills: p.skills.join(", "),
        active: p.user.isActive ? "Yes" : "No",
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return xlsxResponse(buffer, `students-${stamp}.xlsx`);
  }

  if (type === "tasks") {
    const tasks = await prisma.task.findMany({
      where: { ...scope, deletedAt: null },
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Tasks");
    ws.columns = [
      { header: "Title", key: "title", width: 36 },
      { header: "Project", key: "project", width: 24 },
      { header: "Assignee", key: "assignee", width: 22 },
      { header: "Status", key: "status", width: 16 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Deadline", key: "deadline", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    tasks.forEach((t) => {
      ws.addRow({
        title: t.title,
        project: t.project?.name ?? "General Task",
        assignee: t.assignee?.name ?? "Unassigned",
        status: TASK_STATUS_LABELS[t.status],
        priority: t.priority,
        deadline: t.deadline ? format(t.deadline, "yyyy-MM-dd") : "",
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return xlsxResponse(buffer, `tasks-${stamp}.xlsx`);
  }

  if (type === "daily-logs") {
    const logs = await prisma.dailyLog.findMany({
      where: { ...scope, deletedAt: null },
      include: {
        student: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 5000,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Daily Logs");
    ws.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Student", key: "student", width: 24 },
      { header: "Project", key: "project", width: 24 },
      { header: "Hours", key: "hours", width: 10 },
      { header: "Status", key: "status", width: 14 },
      { header: "Summary", key: "summary", width: 60 },
    ];
    ws.getRow(1).font = { bold: true };
    logs.forEach((l) => {
      ws.addRow({
        date: format(l.date, "yyyy-MM-dd"),
        student: l.student.name,
        project: l.project?.name ?? "",
        hours: l.hoursWorked,
        status: DAILY_LOG_STATUS_LABELS[l.status],
        summary: l.description,
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return xlsxResponse(buffer, `daily-logs-${stamp}.xlsx`);
  }

  if (type === "summary") {
    const [students, projects, tasksDone, tasksOpen, reports] =
      await Promise.all([
        prisma.user.count({ where: { isSystemAdmin: false, ...scope } }),
        prisma.project.count({ where: { ...scope, deletedAt: null } }),
        prisma.task.count({
          where: { ...scope, deletedAt: null, status: "COMPLETED" },
        }),
        prisma.task.count({
          where: {
            ...scope,
            deletedAt: null,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }),
        prisma.dailyLog.count({ where: { ...scope, deletedAt: null } }),
      ]);

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const ink = rgb(0.1, 0.1, 0.12);
    const muted = rgb(0.45, 0.45, 0.5);

    page.drawText("DRISHTI — Program Summary", {
      x: 50,
      y: 780,
      size: 22,
      font: bold,
      color: ink,
    });
    page.drawText(`Generated ${format(new Date(), "d MMM yyyy, HH:mm")}`, {
      x: 50,
      y: 758,
      size: 11,
      font,
      color: muted,
    });

    const rows: [string, string][] = [
      ["Students", String(students)],
      ["Projects", String(projects)],
      ["Tasks completed", String(tasksDone)],
      ["Tasks open", String(tasksOpen)],
      ["Daily reports submitted", String(reports)],
    ];
    let y = 700;
    rows.forEach(([label, value]) => {
      page.drawText(label, { x: 50, y, size: 13, font, color: ink });
      page.drawText(value, { x: 400, y, size: 13, font: bold, color: ink });
      y -= 30;
    });

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="summary-${stamp}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 404 });
}
