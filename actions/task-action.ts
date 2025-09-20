// lib/task-service.ts
import { TASK_STATUS_OPTIONS } from "@/lib/constants";
import { db } from "@/lib/db";
import { TaskStatus } from "@prisma/client";

export async function getTasksForDay() {
  const today = new Date();


    const rawTasks  = await db.task.findMany({
    where: {
      OR: [
        {
          startDate: {
            gte: new Date(today.setHours(0, 0, 0, 0)),
            lte: new Date(today.setHours(23, 59, 59, 999)),
          },
        },
        {
          dueDate: {
            gte: new Date(today.setHours(0, 0, 0, 0)),
            lte: new Date(today.setHours(23, 59, 59, 999)),
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
      status: TaskStatus.TODO,
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