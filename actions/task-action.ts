// lib/task-service.ts
import { db } from "@/lib/db";

export async function getTasksForDay(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return db.task.findMany({
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
}
