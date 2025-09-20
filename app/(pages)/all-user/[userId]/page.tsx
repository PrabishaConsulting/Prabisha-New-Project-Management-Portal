import { db } from "@/lib/db";
import { UserPerformanceClient } from "./_components/user-performance-client";
import { notFound } from "next/navigation";
import { Task } from "@prisma/client";

// Define a new type for tasks with numbers instead of Decimals
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
      assignedTasks: true,
      department: true,
    },
  });

  if (!user) {
    notFound();
  }

  // FIX: Convert Decimal fields to numbers before passing to the client
  const safeTasks: SafeTask[] = user.assignedTasks.map((task) => ({
    ...task,
    estimatedHours: task.estimatedHours ? task.estimatedHours.toNumber() : null,
    actualHours: task.actualHours.toNumber(),
  }));

  const safeUser = { ...user, assignedTasks: safeTasks };

  return <UserPerformanceClient user={safeUser} />;
}