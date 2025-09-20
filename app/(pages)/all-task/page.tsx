// app/(pages)/all-task/page.tsx
import { Suspense } from "react";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { getTasksForDay, getTaskStatsForDay } from "@/actions/task-action";
import TaskTable from "./_components/task.table";
import TaskDashboard from "./_components/task-dashboard";
import StatusCard from "./_components/task.stats";
import { TaskData } from "./_components/task.coloumn";
import { StatusCardSkeleton, TaskDashboardSkeleton, TaskTableSkeleton } from "./_components/skeletons";


export default async function AllTaskPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Date();

  // Fetch server data
  const statsPromise = getTaskStatsForDay(today);
  const tasksPromise = getTasksForDay();

  const stats = await statsPromise;
  const rawTasks = await tasksPromise;

  const safeTasks: TaskData[] = rawTasks.map((task) => ({
    ...task,
    estimatedHours: task.estimatedHours ? task.estimatedHours.toNumber() : null,
    actualHours: task.actualHours.toNumber(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        {getGreeting()} {user.name}!{" "}
        All your tasks for{" "}
        {today.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h1>

      <div className="mb-6 space-y-4">
        {/* Stats Card with Suspense */}
        <Suspense fallback={<StatusCardSkeleton />}>
          <StatusCard {...stats} />
        </Suspense>

        {/* Task Dashboard with Suspense */}
        <Suspense fallback={<TaskDashboardSkeleton />}>
          <TaskDashboard userId={user?.id} />
        </Suspense>
      </div>

      <h1 className="text-2xl font-bold mb-4">
        All Team Tasks for{" "}
        {today.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h1>

      {/* Task Table with Suspense */}
      <Suspense fallback={<TaskTableSkeleton />}>
        <TaskTable data={safeTasks} />
      </Suspense>
    </div>
  );
}
