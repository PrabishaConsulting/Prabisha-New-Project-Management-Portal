import { PrismaClient, ActivityLog } from '@prisma/client';
import { ActivityAction } from './helper';

// Define the parameters the function will accept
interface LogParams {
  userId: string;
  action: ActivityAction;
  projectId: string;
  taskId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Define the shape of the return value for type safety
interface LogResult {
  data: ActivityLog | null;
  error: Error | null;
}

/**
 * Creates an activity log entry in the database.
 * This function is designed to be resilient. It catches its own errors
 * to ensure that a failure in logging does not crash the primary operation.
 *
 * @param prisma The Prisma Client instance.
 * @param params The data for the log entry.
 * @returns An object containing either the created log data or an error.
 */
export async function logActivity(
  prisma: PrismaClient,
  params: LogParams
): Promise<LogResult> {
  try {
    const newLog = await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        description: params.description,
        // Correctly assign IDs directly to the foreign key fields
        projectId: params.projectId,
        taskId: params.taskId, // Works even if params.taskId is undefined
        // Safely serialize the metadata object into a JSON string
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });

    // On success, return the data with no error
    return { data: newLog, error: null };
  } catch (error) {
    // If logging fails, log the error to the console for internal review.
    console.error('Failed to create activity log:', error);

    // IMPORTANT: Return the error but do not re-throw it.
    // This allows the calling API to continue its execution.
    return { data: null, error: error as Error };
  }
}