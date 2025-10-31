// /app/api/tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { createTask } from "@/services/task-service/task.service";
import { taskFormSchema } from "@/lib/zod";
import { handleApiError } from "@/utils/apiResponse"; // Import the error handler
import { AppError } from "@/utils/errors"; // Import AppError for auth check

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      // --- MODIFIED: Throw a specific error for auth failure ---
      throw new AppError('Authentication required.', 'UNAUTHORIZED');
    }

    const body = await req.json();
    const validatedData = taskFormSchema.parse(body);
    
    const newTask = await createTask(validatedData, user.id);

    return NextResponse.json(newTask, { status: 201 });

  } catch (error) {
    // --- MODIFIED: All errors are now handled by the central utility ---
    return handleApiError(error);
  }
}


