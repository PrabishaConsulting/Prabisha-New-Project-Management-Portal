import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@/app/generated/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    const tasks = await db.task.findMany({
      where: {
        assigneeId: userId,
        project: {
          isClientProject: true, // Filter for client projects
        },
        // Filter for active tasks
        status: { in: [TaskStatus.TO_DO, TaskStatus.IN_PROGRESS] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[CLIENT_TASKS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}