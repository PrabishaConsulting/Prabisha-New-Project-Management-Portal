// app/(pages)/all-task/page.tsx
import { Suspense } from "react";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { getTasksForDay, getTaskStatsForDay } from "@/actions/task-action";
import TaskTable from "./_components/task.table";
import TaskDashboard from "./_components/task-dashboard";
import StatusCard from "./_components/task.stats";
import { TaskData } from "./_components/task.coloumn";
import { StatusCardSkeleton, TaskDashboardSkeleton, TaskTableSkeleton } from "./_components/skeletons";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AllTaskPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const getRolebyId = async() => {
    const role = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        role: true,
      },
    });
    return role;
  }

  const today = new Date();

  // Fetch server data
  const statsPromise = getTaskStatsForDay(today);
  const tasksPromise = getTasksForDay(today);

  const stats = await statsPromise;
  const rawTasks = await tasksPromise;

  const safeTasks: TaskData[] = rawTasks.map((task) => ({
    ...task,
    estimatedMinutes: task.estimatedMinutes ? task.estimatedMinutes : null,
    actualHours: task.estimatedMinutes,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  }));

  // Filter tasks for current user (My Tasks) and team tasks
  const myTasks = safeTasks.filter(task => task.assigneeId === user.id);
  const teamTasks = safeTasks.filter(task => task.assigneeId !== user.id);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {getGreeting()} {user.name}!{" "}
        Tasks for{" "}
        {today.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h1>

      {/* My Tasks Card */}
      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Task Dashboard with Suspense */}
          <Suspense fallback={<TaskDashboardSkeleton />}>
            <TaskDashboard userId={user?.id} />
          </Suspense>
          
          {/* My Tasks Table */}
          <Suspense fallback={<TaskTableSkeleton />}>
            <TaskTable data={myTasks} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Team Tasks Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Team Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Team Stats Card with Suspense */}
          <Suspense fallback={<StatusCardSkeleton />}>
            <StatusCard {...stats} />
          </Suspense>
          
          {/* Team Tasks Table */}
          <Suspense fallback={<TaskTableSkeleton />}>
            <TaskTable data={teamTasks} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}