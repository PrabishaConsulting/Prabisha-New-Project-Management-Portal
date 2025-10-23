// app/api/tasks/[taskId]/time-entry/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const { minutes, description } = await req.json();

    if (!minutes || minutes <= 0) {
      return NextResponse.json(
        { error: "Valid minutes are required" },
        { status: 400 }
      );
    }

    // Verify task exists and user has access - do this outside the transaction
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user is a member of the workspace
    const isMember = task.project.workspace.members.some(
      (member) => member.userId === userId
    );

    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create time entry and update task's actualMinutes in a transaction with increased timeout
    const result = await db.$transaction(async (tx) => {
      // Create time entry
      const timeEntry = await tx.timeEntry.create({
        data: {
          taskId,
          userId,
          minutes,
          description: description || `Timer session`,
          date: new Date(),
        },
      });

      // Update task's actualMinutes - minimal update without includes
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          actualMinutes: {
            increment: minutes,
          },
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          taskId,
          userId,
          projectId: task.projectId,
          action: "TIME_LOGGED",
          description: `Logged ${minutes} minutes of work`,
        },
      });

      return { timeEntry, taskId };
    }, {
      maxWait: 10000, // 10 seconds
      timeout: 15000, // 15 seconds
    });

    // Fetch the updated task with includes after the transaction completes
    const updatedTaskWithDetails = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      timeEntry: result.timeEntry, 
      task: updatedTaskWithDetails 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating time entry:", error);
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch time entries for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    // Verify task exists and user has access
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isMember = task.project.workspace.members.some(
      (member) => member.userId === userId
    );

    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch time entries
    const timeEntries = await db.timeEntry.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(timeEntries, { status: 200 });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}