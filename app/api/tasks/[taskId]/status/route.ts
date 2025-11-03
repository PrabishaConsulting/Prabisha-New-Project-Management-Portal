import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { updateTaskStatusSchema } from "@/lib/zod";
import {
  canUserAccessTask,
  updateTaskStatus,
} from "@/services/task-service/task-update.service";

// PUT /api/tasks/[taskId]/status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 1. Authentication
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { taskId } = await params;

    // 2. Authorization
    const authCheck = await canUserAccessTask(taskId, user.id);
    if (!authCheck.authorized) {
      const statusCode = authCheck.reason === "NOT_FOUND" ? 404 : 403;
      return NextResponse.json(
        { message: authCheck.error },
        { status: statusCode }
      );
    }

    // 3. Validation
    const body = await request.json();
    const validation = updateTaskStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Invalid input",
          errors: validation.error.format(),
        },
        { status: 400 }
      );
    }

    // Extract validated data
    const { status, comment, actualTime } = validation.data;

    console.log(status, comment , actualTime ,"debug value ")

    // 4. Core Logic
    // Pass actualTime to the service (only if status is DONE)
    const result = await updateTaskStatus(
      taskId,
      status,
      user.id,
      comment,
      status === "DONE" ? actualTime : 0
    );

    console.log(result , "debug done")

    if (result.error) {
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
