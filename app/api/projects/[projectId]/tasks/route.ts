// app/api/projects/[projectId]/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTask } from '@/services/task-service/task.service';
import { getCurrentUser } from '@/utils/getcurrentUser';
import { AuthorizationError } from '@/services/task-service/auth.service';
import { Priority, TaskStatus } from '@/types'; // Adjust this import if needed
import { TaskType } from '@prisma/client';

// 1. Define a schema for the attachment object
const attachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

// 2. Update the main task schema to include attachments and departmentId
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.nativeEnum(TaskStatus),
  description: z.string().optional(),
      taskType: z.nativeEnum(TaskType).default(TaskType.TASK),
  
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
    dueDate: z.coerce.date(),
  assigneeId: z.string().optional(),
  departmentId: z.string().optional(), // Added departmentId
  attachments: z.array(attachmentSchema).optional(), // Added attachments array
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> } // Simplified params type
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();

    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 3. The validated data now includes attachments and other new fields
    const { dueDate, ...taskData } = validation.data;



    const newTask = await createTask(
      {
        ...taskData, // This now correctly passes attachments to your service
        projectId,
        reporterId: user.id,
        dueDate: dueDate ,
      },
      user.id
    );

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('[TASKS_POST]', error);
    if (error instanceof AuthorizationError) {
      return new NextResponse(error.message, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.format()), { status: 400 });
    }
    if (error instanceof Error) {
      // Avoid sending detailed internal error messages to the client in production
      return new NextResponse("An internal error occurred.", { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}