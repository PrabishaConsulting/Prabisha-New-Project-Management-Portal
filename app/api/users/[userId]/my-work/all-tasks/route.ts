import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus, ProjectRole } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Step 1: Fetch the user's details and all their project memberships.
    // This is crucial for knowing their department and their role in each project.
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        projectMemberships: {
          select: {
            projectId: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Create a lookup map for the user's role in each project for efficient access.
    const projectRoles = new Map(
      user.projectMemberships.map((mem) => [mem.projectId, mem.role])
    );

    // Step 2: Fetch all potentially relevant tasks assigned to this user.
    // We get all "active" statuses and will filter 'IN_REVIEW' later based on the user's role.
    const allAssignedTasks = await db.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: [TaskStatus.TO_DO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW , TaskStatus.DONE] },
      },
      include: {
        project: {
          select: { id: true, name: true, isClientProject: true, departmentId: true },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });



    // Step 4: Return the final, structured data payload.
    return NextResponse.json( allAssignedTasks);

  } catch (error) {
    console.error("[ALL_TASKS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}