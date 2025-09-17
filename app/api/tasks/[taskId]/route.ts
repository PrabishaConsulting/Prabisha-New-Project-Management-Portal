import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TaskStatus, Priority, Prisma, } from '@prisma/client';
import { logActivity } from '@/services/activity-user/activity-user.service';
import {ACTIVITY_ACTIONS} from "@/services/activity-user/helper"


const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const currentUserId = session.user.id;
    const { taskId } = await params;

    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);
    if (!validation.success) {
      return new NextResponse(JSON.stringify(validation.error.flatten()), { status: 400 });
    }
    const { status, ...updateData } = validation.data;

    // 1. Authorization Check & Fetch Original Task for Comparison
    const originalTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { name: true } }, // Include assignee name for logging
      },
    });

    if (!originalTask) {
      return new NextResponse(JSON.stringify({ error: 'Task not found' }), { status: 404 });
    }

    const membership = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: originalTask.projectId, userId: currentUserId } },
    });
    if (!membership) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    
    // 2. Perform the Update
    let updatedTask;
    if (status && status !== originalTask.status) {
      // Transaction for when the status (and therefore position) changes
      updatedTask = await db.$transaction(async (tx) => {
        const newPosition = await tx.task.count({
          where: { projectId: originalTask.projectId, status: status },
        });

        return tx.task.update({
          where: { id: taskId },
          data: {
            ...updateData,
            status: status,
            position: newPosition,
          },
        });
      });
    } else {
      // Standard update for all other fields
      updatedTask = await db.task.update({
        where: { id: taskId },
        data: updateData,
      });
    }

    // 3. Generate and Log Activity
    const changes: string[] = [];
    const currentUser = await db.user.findUnique({ where: { id: currentUserId }, select: { name: true }});
    const userName = currentUser?.name || 'A user';

    // Compare fields to build the description
    if (updateData.title && updateData.title !== originalTask.title) {
        changes.push(`renamed the task to **"${updateData.title}"**`);
    }
    if (status && status !== originalTask.status) {
        changes.push(`moved the task to **${status}**`);
    }
    if (updateData.priority && updateData.priority !== originalTask.priority) {
        changes.push(`changed the priority to **${updateData.priority}**`);
    }
    if (updateData.assigneeId !== undefined && updateData.assigneeId !== originalTask.assigneeId) {
        if (updateData.assigneeId === null) {
            changes.push(`unassigned **${originalTask.assignee?.name || 'a user'}**`);
        } else {
            const newAssignee = await db.user.findUnique({ where: { id: updateData.assigneeId }, select: { name: true } });
            changes.push(`assigned the task to **${newAssignee?.name || 'a user'}**`);
        }
    }

    // Only create a log if there were actual changes
    if (changes.length > 0) {
      const description = `${userName} ${changes.join(' and ')}.`;
      await logActivity(db , {
        userId: currentUserId,
        projectId: originalTask.projectId,
        taskId: taskId,
        action: ACTIVITY_ACTIONS.UPDATE_TASK_STATUS,
        description: description,
       
      });
    }
    
    return NextResponse.json(updatedTask);

  } catch (error) {
    console.error('[TASK_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
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