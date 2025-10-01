import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TaskStatus } from '@prisma/client';
import { AuthorizationError } from '@/services/task-service/auth.service';
import { processAndValidateTaskUpdates } from '@/services/task-service/task.service';

const updateTasksOrderSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      position: z.number(),
      status: z.nativeEnum(TaskStatus),
    })
  ),
  projectId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION & VALIDATION
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const currentUserId = session.user.id;

    const body = await request.json();
    const { tasks: tasksToUpdate, projectId } = updateTasksOrderSchema.parse(body);
    // 2. DELEGATE TO THE MAIN SERVICE
    // All complex logic is now handled by this single service call.
    await processAndValidateTaskUpdates(currentUserId, projectId, tasksToUpdate);

    // 3. RESPONSE
    return NextResponse.json({ success: true, message: 'Tasks updated successfully' });
  } catch (error) {
    // 4. ERROR HANDLING
    console.error('[TASKS_UPDATE_ORDER_POST]', error);

    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({ error: 'Invalid input data', details: error.issues }), { status: 400 });
    }
    if (error instanceof AuthorizationError) {
      return new NextResponse(JSON.stringify({ error: error.message }), { status: 403 });
    }
    
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}