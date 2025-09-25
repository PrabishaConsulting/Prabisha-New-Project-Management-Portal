import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // Prisma client
import * as XLSX from "xlsx";

export async function GET() {
  // Fetch projects + their tasks
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
          status: true, // "TO_DO" | "IN_PROGRESS" | "REVIEW" | "DONE"
        },
      },
    },
  });

  // Transform into export-friendly data
  const exportData = projects.map((project) => {
    const total = project.tasks.length;

    const pending = project.tasks.filter(
      (t) => t.status === "TO_DO" || t.status === "IN_PROGRESS"
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
      CreatedAt : formatDate(project.createdAt),
      UpdatedAt : formatDate(project.updatedAt),
      TotalTasks: total,
      PendingTasks: pending,
      CompletedTasks: completed,
      Progress: progress,
    };
  });

  // Convert to sheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");

  // Write to buffer
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="projects.xlsx"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
