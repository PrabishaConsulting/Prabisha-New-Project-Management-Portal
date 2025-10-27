"use server";

import { db } from "@/lib/db";
import { TaskStatus } from "@/app/generated/client";

// The return type now uses 'department' as the key
type DepartmentTaskCount = {
  department: string;
  pending: number;
};

export async function getPendingTasksByDepartment(): Promise<{
  data: DepartmentTaskCount[] | null;
  error: string | null;
}> {
  try {
    const finalStatus: TaskStatus = TaskStatus.DONE;

    const tasksByProject = await db.task.groupBy({
      by: ['projectId'],
      where: {
        status: {
          not: finalStatus,
        },
      },
      _count: {
        _all: true,
      },
    });

    if (tasksByProject.length === 0) {
      return { data: [], error: null };
    }

    const projectIds = tasksByProject.map((taskGroup) => taskGroup.projectId);
    const projectsWithDepartments = await db.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
        departmentId: {
          not: null,
        },
      },
      select: {
        id: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    const departmentCounts = new Map<string, number>();

    const projectDepartmentMap = new Map<string, string>();
    for (const project of projectsWithDepartments) {
      if (project.department) {
        projectDepartmentMap.set(project.id, project.department.name);
      }
    }

    for (const taskGroup of tasksByProject) {
      const departmentName = projectDepartmentMap.get(taskGroup.projectId);
      if (departmentName && taskGroup._count) {
        const currentCount = departmentCounts.get(departmentName) || 0;
        departmentCounts.set(departmentName, currentCount + taskGroup._count._all);
      }
    }

    // --- The Fix ---
    // Change 'name: name' to 'department: name' to match the desired format.
    const chartData = Array.from(departmentCounts.entries()).map(([name, count]) => ({
      department: name, // <-- This line was changed
      pending: count,
    }));

    return { data: chartData, error: null };
  } catch (error) {
    console.error("Failed to fetch pending tasks by department:", error);
    if (error instanceof Error) {
      return { data: null, error: `Database error: ${error.message}` };
    }
    return { data: null, error: "An unknown error occurred." };
  }
}