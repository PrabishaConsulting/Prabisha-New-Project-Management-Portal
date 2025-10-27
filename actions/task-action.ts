// lib/task-service.ts
import { db } from "@/lib/db";
import { TaskStatus } from "@/app/generated/client";

export async function getTasksForDay(today: Date) {
  // 1. FIX: Define start and end of the day once to prevent bugs.
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const rawTasks = await db.task.findMany({
    where: {
      OR: [
        {
          startDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        {
          dueDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        // 2. ADDED: This condition includes tasks created today.
        {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      ],
    },
    include: {
      assignee: true,
      reporter: true,
      project: true,
      department: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return rawTasks;
}

export async function getTaskStatsForDay(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // All tasks created today
  const total = await db.task.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // todo today

  const todo = await db.task.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: TaskStatus.TO_DO,
    },
  });
  const inProgress = await db.task.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: TaskStatus.IN_PROGRESS,
    },
  });
  // In review today
  const inReview = await db.task.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: TaskStatus.REVIEW,
    },
  });

  // Completed today
  const completed = await db.task.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: TaskStatus.DONE,
    },
  });

  return {
    total,
    todo,
    inProgress,
    inReview,
    completed,
  };
}

// src/actions/task-priority.ts

// src/actions/task-priority.ts

export async function getTasksByPriority() {
  try {
    const priorityCounts = await db.task.groupBy({
      by: ["priority"],
      _count: {
        priority: true,
      },
      where: {
        status: {
          not: "DONE", // Exclude tasks with DONE status
        },
      },
    });

    // Define all possible priorities
    const priorities = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

    // Transform data to ensure all priorities are included
    const result = priorities.map((priority) => {
      const found = priorityCounts.find((item) => item.priority === priority);
      return {
        priority: priority.charAt(0) + priority.slice(1).toLowerCase(), // Capitalize first letter
        count: found ? found._count.priority : 0,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching tasks by priority:", error);
    return { success: false, error: "Failed to fetch tasks by priority" };
  }
}

// app/actions/task-actions.ts

// Define completed statuses - adjust these based on your actual TaskStatus enum
const COMPLETED_STATUSES: TaskStatus[] = [
  TaskStatus.DONE, // Assuming DONE is one of your statuses
  // Add any other statuses that indicate a task is completed
];

export async function getTaskCompletionTrendData() {
  try {
    // Fetch all tasks with their creation and completion dates
    const tasks = await db.task.findMany({
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true, // Add this field to the selection
        status: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // If no tasks found, return empty array
    if (tasks.length === 0) {
      return [];
    }

    // Process tasks to group by date
    const createdTasksByDate: Record<string, number> = {};
    const completedTasksByDate: Record<string, number> = {};

    tasks.forEach((task) => {
      // Group created tasks by date
      const createdDate = task.createdAt.toISOString().split("T")[0];
      createdTasksByDate[createdDate] =
        (createdTasksByDate[createdDate] || 0) + 1;

      // Group completed tasks by date (when status is in completed state)
      if (COMPLETED_STATUSES.includes(task.status)) {
        // Use completedAt if available, otherwise fall back to updatedAt
        const completionDate = task.completedAt || task.updatedAt;
        const completedDate = completionDate.toISOString().split("T")[0];
        completedTasksByDate[completedDate] =
          (completedTasksByDate[completedDate] || 0) + 1;
      }
    });

    // Get all unique dates from both created and completed tasks
    const allDates = new Set([
      ...Object.keys(createdTasksByDate),
      ...Object.keys(completedTasksByDate),
    ]);

    // Convert to sorted array and create chart data
    const chartData = Array.from(allDates)
      .sort()
      .map((date) => ({
        date,
        created: createdTasksByDate[date] || 0,
        completed: completedTasksByDate[date] || 0,
      }));

    return chartData;
  } catch (error) {
    console.error("Error fetching task completion trend data:", error);
    return [];
  }
}
