import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Ensure this path is correct

// --- CHANGE 1: Add userId to the interface ---
interface ChartDataItem {
  userId: string; // <-- ADDED
  user: string;
  URGENT: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Get query params from the URL's searchParams
    const searchParams = request.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');

    // Build the where clause dynamically
    const whereClause: any = {
      status: {
        in: ['TO_DO', 'IN_PROGRESS'], // The definition of a "pending" task
      },
      assigneeId: { not: null }, // Exclude unassigned tasks
    };

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    // 2. Group tasks by assignee and priority
    const groupedTasks = await db.task.groupBy({
      by: ['assigneeId', 'priority'],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    // 3. Get all unique assignee IDs from the result
    const assigneeIds = [...new Set(groupedTasks.map(t => t.assigneeId).filter(Boolean))];

    // No users with tasks, return early
    if (assigneeIds.length === 0) {
        return NextResponse.json([], { status: 200 });
    }

    // 4. Fetch user names for those IDs
    const users = await db.user.findMany({
      where: {
        id: { in: assigneeIds as string[] },
      },
      select: {
        id: true,
        name: true,
      },
    });
    
    // Create a map for quick lookup: { userId: userName }
    const userMap = new Map(users.map(u => [u.id, u.name]));

    // 5. Transform the data into the chart format
    // --- CHANGE 2: Use userId as the key for the map for robustness ---
    const dataMap = new Map<string, ChartDataItem>();

    for (const group of groupedTasks) {
      const assigneeId = group.assigneeId!;
      const userName = userMap.get(assigneeId) || 'Unknown User';
      
      if (!dataMap.has(assigneeId)) {
        dataMap.set(assigneeId, {
          userId: assigneeId, // <-- ADDED userId
          user: userName,
          URGENT: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          total: 0,
        });
      }

      const userEntry = dataMap.get(assigneeId)!;
      // Ensure priority is a valid key before assigning
      const priority = group.priority as keyof Omit<ChartDataItem, 'user' | 'total' | 'userId'>;
      if (priority in userEntry) {
        userEntry[priority] = group._count.id;
        userEntry.total += group._count.id;
      }
    }

    // 6. Convert the map, sort, and get the top users
    const finalData = Array.from(dataMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 11); // <-- CHANGE 3: Gets the top 6 users

    // 7. Return a NextResponse object
    return NextResponse.json(finalData, { status: 200 });

  } catch (error) {
    console.error("Failed to fetch user summary:", error);
    // Return a JSON response with an error message
    return NextResponse.json(
      { message: "An internal server error occurred.", data: [] }, 
      { status: 500 }
    );
  }
}