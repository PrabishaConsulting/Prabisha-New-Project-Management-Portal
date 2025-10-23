import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { minutes } = await request.json();
    const {taskId} = await params
    
    if (typeof minutes !== 'number' || minutes < 0) {
      return NextResponse.json(
        { message: 'Invalid minutes value' },
        { status: 400 }
      );
    }
    
    // Update the task's actualMinutes
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        actualMinutes: {
          increment: minutes,
        },
        updatedAt: new Date(),
      },
    });
    
    // Also create a time entry record
    await db.timeEntry.create({
      data: {
        taskId: taskId,
        userId: updatedTask.assigneeId || '', // You might need to pass userId from the client
        minutes,
        date: new Date(),
        description: 'Time tracked via timer',
      },
    });
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task timer:', error);
    return NextResponse.json(
      { message: 'Failed to update task timer' },
      { status: 500 }
    );
  }
}