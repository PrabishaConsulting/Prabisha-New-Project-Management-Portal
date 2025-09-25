// File: app/api/activities/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Adjust this import based on your setup
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust this import based on your auth setup

// Define the Activity type to match your frontend
type ActivityUser = {
  name: string;
  avatar: string;
  email?: string;
};

type Activity = {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: ActivityUser;
};

export async function GET(request: Request) {
  try {
    // Check authentication if needed
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '20', 10);
    
    // Validate parameters
    if (isNaN(skip) || isNaN(take)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    // Set a maximum take value to prevent excessive data retrieval
    const maxTake = 100;
    const actualTake = Math.min(take, maxTake);
    
    // Get today's date range in UTC
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Fetch activities from the database
    const activities = await db.activityLog.findMany({
      where: {
        createdAt: {
          gte: startOfTodayUTC,
          lte: endOfTodayUTC,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: actualTake,
      select: {
        id: true,
        action: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    // Return the data
    return NextResponse.json({ 
      data: activities,
      error: null,
      pagination: {
        skip,
        take: actualTake,
        total: activities.length,
        hasMore: activities.length === actualTake
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}