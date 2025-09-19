// app/(pages)/all-task/page.tsx
import { db } from "@/lib/db";
import TaskTable from "./_components/task.table";
import StatusCard from "./_components/task.stats";
import { getTaskStatsForDay } from "@/actions/task-action";
import { TaskData } from "./_components/task.coloumn";


export default async function AllTaskPage() {
  // Get today's date
  const today = new Date();

  // ✅ Get stats for today
  const stats = await getTaskStatsForDay(today);

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
  });

  // ✅ Convert Decimal fields before passing to client
  const safeTasks: TaskData[] = rawTasks.map((task) => ({
    ...task,
    estimatedHours: task.estimatedHours ? task.estimatedHours.toNumber() : null,
    actualHours: task.actualHours.toNumber(),
    // Also convert all date fields to strings
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  }));

  return (
    <div>
      <StatusCard {...stats} />
      <TaskTable data={safeTasks} />
    </div>
  );
}
