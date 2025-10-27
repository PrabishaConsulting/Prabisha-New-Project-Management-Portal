import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus } from '@/app/generated/client';

export async function GET(
  request: NextRequest, // Use NextRequest to easily access searchParams
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const departmentId = request.nextUrl.searchParams.get('departmentId');

    if (!departmentId) {
      return new NextResponse("Department ID query parameter is required", { status: 400 });
    }

    const tasks = await db.task.findMany({
      where: {
        assigneeId: userId,
        project: {
          departmentId: departmentId, // Filter for the specific department
          isClientProject: false,      // Exclude client projects from these tabs
        },
        status: { in: [TaskStatus.TO_DO, TaskStatus.IN_PROGRESS] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[DEPT_TASKS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}