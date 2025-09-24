import { db } from "@/lib/db";
import { UserPerformanceClient } from "./_components/user-performance-client";
import TaskTable from "@/app/(pages)/all-task/_components/task.table";
import { notFound } from "next/navigation";
import { Task } from "@prisma/client";
import { TaskData } from "@/app/(pages)/all-task/_components/task.coloumn";

// Define SafeTask for UserPerformanceClient
export type SafeTask = Omit<Task, "estimatedHours" | "actualHours"> & {
  estimatedHours: number | null;
  actualHours: number;
};

export default async function UserPerformancePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      assignedTasks: {
        include: {
          assignee: true,
          reporter: true,
          project: {
            include: {
              workspace: true,
            },
          },
          department: true,
        },
      },
      department: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Transform tasks for TaskTable (TaskData[])
  const tasksForTable: any = user.assignedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    estimatedHours: task.estimatedHours ? task.estimatedHours.toNumber() : null,
    actualHours: task.actualHours.toNumber(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    startDate: task.startDate ? task.startDate.toISOString() : null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    assignee: task.assignee ? {
      id: task.assignee.id,
      name: task.assignee.name || "",
      email: task.assignee.email,
      role: task.assignee.role,
      avatar: task.assignee.avatar,
      departmentId: task.assignee.departmentId,
      location: task.assignee.location,
    } : null,
    reporter: task.reporter ? {
      id: task.reporter.id,
      name: task.reporter.name || "",
      email: task.reporter.email,
      role: task.reporter.role,
      avatar: task.reporter.avatar,
      departmentId: task.reporter.departmentId,
      location: task.reporter.location,
    } : null,
    project: task.project ? {
      id: task.project.id,
      name: task.project.name,
      description: task.project.description,
      status: task.project.status,
      startDate: task.project.startDate?.toISOString() || null,
      workspaceId: task.project.workspaceId,
    } : null,
    department: task.department ? {
      id: task.department.id,
      name: task.department.name,
    } : null,
    workspaceId: task.project?.workspaceId || "",
    position: task.position,
    departmentId: task.departmentId,
    projectId: task.projectId,
    reporterId: task.reporterId,
    assigneeId: task.assigneeId,
  }));

  // Transform tasks for UserPerformanceClient (SafeTask[])
  const safeTasksForClient: SafeTask[] = user.assignedTasks.map((task) => ({
    ...task,
    estimatedHours: task.estimatedHours ? task.estimatedHours.toNumber() : null,
    actualHours: task.actualHours.toNumber(),
  }));

  // Create safeUser with SafeTask[] for assignedTasks
  const safeUser = {
    ...user,
    assignedTasks: safeTasksForClient,
  };

  return (
    <div className="space-y-6">
      <UserPerformanceClient user={safeUser} />
      <div>
        <h2 className="text-2xl font-bold mb-4">Assigned Tasks</h2>
        <TaskTable data={tasksForTable} />
      </div>
    </div>
  );
}