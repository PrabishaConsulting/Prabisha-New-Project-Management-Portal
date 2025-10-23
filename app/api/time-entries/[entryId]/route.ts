// app/api/time-entries/[entryId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// UPDATE time entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const { minutes, description } = await req.json();

    if (!minutes || minutes <= 0) {
      return NextResponse.json(
        { error: "Valid minutes are required" },
        { status: 400 }
      );
    }

    // Find existing time entry
    const existingEntry = await db.timeEntry.findUnique({
      where: { id: entryId },
      include: {
        task: {
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
        },
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    // Check if user has access (must be creator or workspace admin)
    const isMember = existingEntry.task.project.workspace.members.some(
      (member) => member.userId === userId
    );
    const isCreator = existingEntry.userId === userId;

    if (!isMember || !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate the difference in minutes
    const minutesDifference = minutes - existingEntry.minutes;

    // Update time entry and task's actualMinutes in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update time entry
      const updatedEntry = await tx.timeEntry.update({
        where: { id: entryId },
        data: {
          minutes,
          description: description || existingEntry.description,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update task's actualMinutes
      const updatedTask = await tx.task.update({
        where: { id: existingEntry.taskId },
        data: {
          actualMinutes: {
            increment: minutesDifference,
          },
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          taskId: existingEntry.taskId,
          userId,
          projectId : updatedTask.projectId,
          action: "TIME_UPDATED",
          description: `Updated time entry from ${existingEntry.minutes} to ${minutes} minutes`,
        },
      });

      return { timeEntry: updatedEntry, updatedTask };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error updating time entry:", error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
      { status: 500 }
    );
  }
}

// DELETE time entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;

    // Find existing time entry
    const existingEntry = await db.timeEntry.findUnique({
      where: { id: entryId },
      include: {
        task: {
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
        },
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    const isMember = existingEntry.task.project.workspace.members.some(
      (member) => member.userId === userId
    );
    const isCreator = existingEntry.userId === userId;

    if (!isMember || !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete time entry and update task's actualMinutes in a transaction
    await db.$transaction(async (tx) => {
      // Delete time entry
      await tx.timeEntry.delete({
        where: { id: entryId },
      });

      // Decrease task's actualMinutes
      await tx.task.update({
        where: { id: existingEntry.taskId },
        data: {
          actualMinutes: {
            decrement: existingEntry.minutes,
          },
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          taskId: existingEntry.taskId,
          userId,
          projectId: existingEntry.task.projectId,
          action: "TIME_DELETED",
          description: `Deleted time entry of ${existingEntry.minutes} minutes`,
        },
      });
    });

    return NextResponse.json(
      { message: "Time entry deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return NextResponse.json(
      { error: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}