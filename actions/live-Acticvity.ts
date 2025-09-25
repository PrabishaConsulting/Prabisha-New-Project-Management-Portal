import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
// Define a new, more minimal type for our return data
const minimalActivity = Prisma.validator<Prisma.ActivityLogDefaultArgs>()({
  // Use 'select' to specify EXACTLY which fields we want
  select: {
    id: true,
    description: true,
    createdAt: true,
    user: {
      select: {
        name: true,
        email: true, // Only get the user's name
        avatar: true, // Only get the user's avatar
      },
    },
  },
});

// The new type derived from our minimal selection
export type MinimalActivity = Prisma.ActivityLogGetPayload<typeof minimalActivity>;

export async function getTodaysActivity(skip: number = 0): Promise<{
  data: MinimalActivity[] | null;
  error: string | null;
}> {
  try {
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Add a timeout to prevent long-running queries
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );

    const queryPromise = db.activityLog.findMany({
      where: {
        createdAt: {
          gte: startOfTodayUTC,
          lte: endOfTodayUTC,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: skip,
      take: 20, // Match client page size
      ...minimalActivity,
    });

    // Race the query against a timeout
    const activities = await Promise.race([queryPromise, timeoutPromise]) as MinimalActivity[];

    return { data: activities, error: null };
  } catch (error) {
    console.error("Failed to fetch minimal activity logs:", error);
    if (error instanceof Error) {
        return { data: null, error: `Failed to fetch activity: ${error.message}` };
    }
    return { data: null, error: "An unknown error occurred while fetching activity." };
  }
}