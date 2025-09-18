// app/(pages)/all-task/page.tsx
import { db } from "@/lib/db";
import TaskTable from "./_components/task.table";

export default async function AllTaskPage() {
  // Get start & end of today
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const tasks = await db.task.findMany({
    where: {
      // You can use either startDate OR dueDate depending on requirement
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
  });

  // ✅ Convert Decimal fields before passing to client
  const safeTasks = tasks.map((task) => ({
    ...task,
    estimatedHours: task.estimatedHours ? task.estimatedHours.toNumber() : null,
    actualHours: task.actualHours ? task.actualHours.toNumber() : 0,
  }));

  return <TaskTable data={safeTasks} />;
}
