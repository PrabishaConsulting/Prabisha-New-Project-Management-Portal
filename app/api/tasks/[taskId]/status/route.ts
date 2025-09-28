import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { updateTaskStatusSchema } from "@/lib/zod";
import {
  canUserAccessTask,
  updateTaskStatus,
} from "@/services/task-service/task-update.service";
import { logActivity } from "@/services/activity-user/activity-user.service";
import { ACTIVITY_ACTIONS } from "@/services/activity-user/helper";
import { db } from "@/lib/db";

// Correct App Router signature for a PUT request with dynamic params
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 1. Authentication: Check if a user is logged in
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { taskId } = await params;

    // 2. Authorization: Check if this user is allowed to modify this task
    const authCheck = await canUserAccessTask(taskId, user.id);
    if (!authCheck.authorized) {
      const statusCode = authCheck.reason === "NOT_FOUND" ? 404 : 403;
      return NextResponse.json(
        { message: authCheck.error },
        { status: statusCode }
      );
    }

    // 3. Validation: Parse and validate the request body
    const body = await request.json();
    const validation = updateTaskStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid input",
          // FIX: Use the modern .format() method
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    // 4. Core Logic: Update the task status
    const { status } = validation.data;
    const result = await updateTaskStatus(taskId, status);
    const project = await db.project.findFirst({
      where: {
        tasks: {
          some: {
            id: taskId,
          },
        },
      },
      select: {
        id: true, // Only select the project ID
      },
    });


    await logActivity(db, {
      userId: user.id,
      projectId: project?.id || "",
      taskId: taskId,
      action: ACTIVITY_ACTIONS.UPDATE_TASK_STATUS,
      description: `${user.name} has updated the task status to ${status}.`,
    });

    if (result.error) {
      // This case is unlikely if authorization passed, but good for safety
      return NextResponse.json({ message: result.error }, { status: 404 });
    }

    // 5. Success Response
    return NextResponse.json(result.task, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/tasks/[taskId]/status:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
