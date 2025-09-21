import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db"; // your prisma client instance
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Assuming auth options path
import { logActivity } from "@/services/activity-user/activity-user.service"; // Assuming service path
import { ACTIVITY_ACTIONS } from "@/services/activity-user/helper";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Try deleting the task
    const { taskId } = await params;

    const taskToDelete = await db.task.findUnique({
      where: { id: taskId },
    });

    // If the task doesn't exist, return a 404 error
    if (!taskToDelete) {
      return NextResponse.json(
        { message: `Delete failed: Task with ID ${taskId} not found.` },
        { status: 404 }
      );
    }

    // (Optional but Recommended) Authorization check
    const membership = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: taskToDelete.projectId,
          userId: session.user.id,
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. --- Perform Deletion ---
    await db.task.delete({
      where: { id: taskId },
    });

    // 4. --- Log the activity ---
    const userName = session.user.name || "A user";
    await logActivity(db, {
      userId: session.user.id,
      projectId: taskToDelete.projectId,
      taskId: taskToDelete.id,
      action: ACTIVITY_ACTIONS.DELETE_TASK, // Assumes this action type exists
      description: `${userName} deleted the task "${taskToDelete.title}".`,
    });

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Task Failed:", error);

    // Handle "Record not found" error
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: `Delete failed: Task with  not found.` },
        { status: 404 }
      );
    }

    // Generic error
    return NextResponse.json(
      { message: "Failed to delete task" },
      { status: 500 }
    );
  }
}
