import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TaskStatus, Priority, Prisma, } from '@/app/generated/client';

import { updateTaskService } from '@/services/task-service/task-update.service'; // <-- Import your new service


const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  estimatedMinutes: z.number().optional().nullable(),
  actualMinutes: z.number().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {

    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;


    // 2. Validation
    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(validation.error.flatten(), { status: 400 });
    }
    
    // 3. Call the Service
    const result = await updateTaskService(
       taskId,
        validation.data,
        session.user.id
    );

    // 4. Handle the service's response and return it
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);

  } catch (error) {
    console.error('[TASK_PATCH_API]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
  ) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      const { taskId } = await params;
  
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          reporter: { select: { id: true, name: true, avatar: true } },
          comments: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          timeEntries: {
            orderBy: { createdAt: 'desc' },
          },
          // We will fetch activity logs separately if needed, to keep this initial load fast
        },
      });
  
      if (!task) {
        return new NextResponse(JSON.stringify({ error: 'Task not found' }), { status: 404 });
      }
  
      // Authorization: Check if the user is a member of the project
      const membership = await db.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: session.user.id } },
      });
      if (!membership) {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      }
  
      return NextResponse.json(task);
    } catch (error) {
      console.error('[TASK_GET]', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }