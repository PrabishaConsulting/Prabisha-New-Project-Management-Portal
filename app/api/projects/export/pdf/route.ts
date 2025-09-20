import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Prisma client
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET() {
  // Fetch projects + tasks
  const projects = await db.project.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      projectCode: true,
      tasks: {
        select: {
          status: true,
        },
      },
    },
  });

  // Transform data
  const exportData = projects.map((project) => {
    const total = project.tasks.length;
    const pending = project.tasks.filter(
      (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
    ).length;
    const completed = project.tasks.filter(
      (t) => t.status === "REVIEW" || t.status === "DONE"
    ).length;
    const progress =
      total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%";

    return {
      ProjectID: project.projectCode,
      Name: project.name,
      Status: project.status,
      CreatedAt: formatDate(project.createdAt),
      UpdatedAt: formatDate(project.updatedAt),
      TotalTasks: total,
      PendingTasks: pending,
      CompletedTasks: completed,
      Progress: progress,
    };
  });

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([800, 600]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  let y = height - 40;

  // Header
  page.drawText("Projects Report", {
    x: 50,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });

  y -= 30;

  // Table headers
  const headers = [
    "ProjectID",
    "Name",
    "Status",
    "CreatedAt",
    "UpdatedAt",
    "TotalTasks",
    "PendingTasks",
    "CompletedTasks",
    "Progress",
  ];

  page.drawText(headers.join(" | "), { x: 50, y, size: fontSize, font });
  y -= 20;

  // Table rows
  exportData.forEach((row) => {
    const rowText = headers.map((h) => row[h as keyof typeof row]).join(" | ");
    page.drawText(rowText, { x: 50, y, size: fontSize, font });
    y -= 20;

    // Add new page if running out of space
    if (y < 50) {
      y = height - 40;
      pdfDoc.addPage([800, 600]);
    }
  });

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes); // <-- This fixes the TS error

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="projects.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0"); 
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
