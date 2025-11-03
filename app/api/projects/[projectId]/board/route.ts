// File: app/api/projects/[projectId]/board/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return new NextResponse("Project ID is missing in request.", { status: 400 });
    }

    // Extract pagination params from query
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Fetch project data
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    // Get task counts by status
    const taskCounts = await db.task.groupBy({
      by: ['status'],
      where: { projectId },
      _count: {
        status: true,
      },
    });

    // Format task counts to a simple object
    const counts: Record<string, number> = {};
    taskCounts.forEach(item => {
      counts[item.status] = item._count.status;
    });

    // Fetch paginated tasks
    const [tasks, totalTasks] = await Promise.all([
      db.task.findMany({
        where: { projectId },
        orderBy: { position: "asc" },
        skip,
        take: limit,
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
        },
      }),
      db.task.count({ where: { projectId } }),
    ]);

    const totalPages = Math.ceil(totalTasks / limit);

    return NextResponse.json({
      project,
      tasks,
      taskCounts: counts,
      pagination: {
        page,
        limit,
        totalTasks,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[BOARD_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}