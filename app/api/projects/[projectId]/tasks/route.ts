import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTask } from '@/services/task-service/task.service';
import { getCurrentUser } from '@/utils/getcurrentUser';
import { AuthorizationError } from '@/services/task-service/auth.service';
import { Priority, TaskStatus } from '@/types';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.nativeEnum(TaskStatus),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { projectId } = params;
    const body = await request.json();

    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.format()), { status: 400 });
    }
        const { dueDate, ...taskData } = validation.data;


    const newTask = await createTask(
      {
        ...taskData,
        projectId,
        reporterId: user.id,
         dueDate: dueDate ? new Date(dueDate) : undefined,

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
      return new NextResponse(error.message, { status: 500 });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}