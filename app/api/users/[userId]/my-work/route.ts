import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  // 1. Authentication & Authorization
  const {userId} =await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch all necessary data in a single, efficient query
    const [user, tasksFromDb] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          departmentId: true,
          department: { select: { name: true } },
        },
      }),
      db.task.findMany({
        where: { assigneeId: userId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              isClientProject: true,
              workspaceId: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Initialize arrays and maps for processing
    const allTasks: any[] = [];
    const clientTasks: any[] = [];
    const departmentMap = new Map<string, { departmentName: string; tasks: any[] }>();

    // 4. Process the tasks into the required formats
    for (const task of tasksFromDb) {
      if (!task.project) continue; // Skip tasks without a project

      // Create a clean task object for the frontend
      const taskData = {
        id: task.id,
        title: task.title,
        status: task.status,
        projectId: task.projectId,
        workspaceId: task.project.workspaceId,
        project: {
          name: task.project.name,
          isClientProject: task.project.isClientProject,
        },
      };

      // Add to the 'allTasks' list
      allTasks.push(taskData);

      // Separate into client or department groups
      if (task.project.isClientProject) {
        // Add to the flat 'clientTasks' list
        clientTasks.push(taskData);
      } else {
        // Group by department for internal tasks
        const departmentId = task.project.department?.id ?? 'general';
        const departmentName = task.project.department?.name ?? 'General';

        if (!departmentMap.has(departmentId)) {
          departmentMap.set(departmentId, { departmentName, tasks: [] });
        }
        departmentMap.get(departmentId)!.tasks.push(taskData);
      }
    }

    // 5. Calculate overall stats
    const stats = {
      todo: tasksFromDb.filter((t) => t.status === 'TO_DO').length,
      inProgress: tasksFromDb.filter((t) => t.status === 'IN_PROGRESS').length,
      review: tasksFromDb.filter((t) => t.status === 'REVIEW').length,
      done: tasksFromDb.filter((t) => t.status === 'DONE').length,
      total: tasksFromDb.length,
    };

    // 6. Construct the final payload with all three required data structures
    const payload = {
      user,
      stats,
      allTasks, // A flat list of every task
      clientTasks, // A flat list of tasks where project.isClientProject is true
      departmentProjectGroups: Array.from(departmentMap.entries()) // Tasks grouped by department
        .map(([id, data]) => ({ departmentId: id, ...data }))
        .sort((a, b) => a.departmentName.localeCompare(b.departmentName)),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to fetch user work summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}