import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Define the shape of the data we'll return
interface UserStatusData {
  TO_DO: number;
  IN_PROGRESS: number;
  REVIEW: number;
  DONE: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const groupedTasks = await db.task.groupBy({
      by: ['status'],
      where: {
        assigneeId: userId,
      },
      _count: {
        id: true,
      },
    });

    // Transform the data into a simple key-value object
    const statusData: UserStatusData = {
      TO_DO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      DONE: 0,
    };

    groupedTasks.forEach(item => {
      if (item.status in statusData) {
        statusData[item.status as keyof UserStatusData] = item._count.id;
      }
    });

    return NextResponse.json(statusData, { status: 200 });

  } catch (error) {
    console.error("Failed to fetch user status summary:", error);
    return NextResponse.json(
      { message: "An internal server error occurred." }, 
      { status: 500 }
    );
  }
}