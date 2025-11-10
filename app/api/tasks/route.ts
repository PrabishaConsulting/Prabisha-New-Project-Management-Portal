// /app/api/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { createTask } from "@/services/task-service/task.service";
import { taskFormSchema } from "@/lib/zod";
import { handleApiError } from "@/utils/apiResponse"; // Import the error handler
import { AppError } from "@/utils/errors"; // Import AppError for auth check
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      // --- MODIFIED: Throw a specific error for auth failure ---
      throw new AppError("Authentication required.", "UNAUTHORIZED");
    }

    const body = await req.json();
    const validatedData = taskFormSchema.parse(body);

    const newTask = await createTask(validatedData, user.id);

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    // --- MODIFIED: All errors are now handled by the central utility ---
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const exportType = searchParams.get("export");

    // Build where clause for search
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { taskCode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { status: { contains: search, mode: "insensitive" } },
        { priority: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    if (sort) {
      orderBy[sort] = order;
    } else {
      orderBy.createdAt = "desc";
    }

    // If export, get all data without pagination
    if (exportType) {
      const tasks = await db.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          reporter: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
        orderBy,
      });

      const exportData = tasks.map((task) => ({
        ID: task.id,
        "Task Code": task.taskCode || "-",
        Title: task.title,
        Description: task.description || "-",
        Project: task.project?.name || "-",
        Assignee: task.assignee?.name || "-",
        Reporter: task.reporter?.name || "-",
        Department: task.department?.name || "-",
        Type: task.taskType || "TASK",
        Priority: task.priority,
        Status: task.status,
        "Estimated Minutes": task.estimatedMinutes || "-",
        "Actual Minutes": task.actualMinutes || 0,
        "Start Date": task.startDate ? task.startDate.toLocaleDateString() : "-",
        "Due Date": task.dueDate ? task.dueDate.toLocaleDateString() : "-",
        "Completed At": task.completedAt ? task.completedAt.toLocaleDateString() : "-",
        Created: task.createdAt.toLocaleDateString(),
        Updated: task.updatedAt.toLocaleDateString(),
      }));

      if (exportType === "excel") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
        
        return new NextResponse(excelBuffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="tasks_${new Date().toISOString().split("T")[0]}.xlsx"`,
          },
        });
      }

      if (exportType === "pdf") {
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text("Tasks Report", 14, 15);
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
        
        // Add table
        const headers = Object.keys(exportData[0] || {});
        const rows = exportData.map((item) => Object.values(item));
        
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 30,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        
        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
        
        return new NextResponse(pdfBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="tasks_${new Date().toISOString().split("T")[0]}.pdf"`,
          },
        });
      }
    }

    // Get paginated data
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          reporter: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          department: {
            select: { id: true, name: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.task.count({ where }),
    ]);

    // Transform data for the frontend
    const transformedTasks = tasks.map((task) => ({
      ...task,
      assigneeName: task.assignee?.name || "-",
      reporterName: task.reporter?.name || "-",
      projectName: task.project?.name || "-",
      departmentName: task.department?.name || "-",
    }));

    return NextResponse.json({
      columns: [
        { key: "id", label: "ID", sortable: true },
        { key: "taskCode", label: "Task Code", sortable: true },
        { key: "title", label: "Title", sortable: true },
        { key: "projectName", label: "Project", sortable: true },
        { key: "assigneeName", label: "Assignee", sortable: true },
        { key: "reporterName", label: "Reporter", sortable: true },
        { key: "departmentName", label: "Department", sortable: true },
        { key: "priority", label: "Priority", sortable: true },
        { key: "status", label: "Status", sortable: true },
        { key: "estimatedMinutes", label: "Est. Minutes", sortable: true },
        { key: "actualMinutes", label: "Actual Minutes", sortable: true },
        { key: "dueDate", label: "Due Date", sortable: true },
        { key: "createdAt", label: "Created", sortable: true },
      ],
      data: transformedTasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Check if task exists
    const existingTask = await db.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Delete the task (this will cascade delete related records)
    await db.task.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: `Task "${existingTask.title}" deleted successfully`,
      deletedTaskId: id 
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Check if task exists
    const existingTask = await db.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Update the task
    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        reporter: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
    });

    // Transform data for the frontend
    const transformedTask = {
      ...updatedTask,
      assigneeName: updatedTask.assignee?.name || "-",
      reporterName: updatedTask.reporter?.name || "-",
      projectName: updatedTask.project?.name || "-",
      departmentName: updatedTask.department?.name || "-",
    };

    return NextResponse.json({
      message: "Task updated successfully",
      task: transformedTask,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}