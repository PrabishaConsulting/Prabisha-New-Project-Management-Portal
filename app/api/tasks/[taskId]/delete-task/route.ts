import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/services/activity-user/activity-user.service";
import { ACTIVITY_ACTIONS } from "@/services/activity-user/helper";
import { id } from "date-fns/locale";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = await params;
    if (!id.taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const taskToDelete = await db.task.findUnique({
      where: { id: id.taskId },
    });

    if (!taskToDelete) {
      return NextResponse.json(
        { error: `Task with ID ${id.taskId} not found` }, // FIXED: Use error property
        { status: 404 }
      );
    }

    const membership = await db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: taskToDelete.projectId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member" },
        { status: 403 }
      );
    }

    await db.task.delete({
      where: { id: id.taskId },
    });

    const userName = session.user.name || "A user";
    await logActivity(db, {
      userId: session.user.id,
      projectId: taskToDelete.projectId,
      action: ACTIVITY_ACTIONS.DELETE_TASK,
      description: `${userName} deleted the task "${taskToDelete.title}".`,
    });

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Task Failed:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: `Task with ID not found` }, // FIXED: Include taskId
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete task" }, // FIXED: Use error property
      { status: 500 }
    );
  }
}
