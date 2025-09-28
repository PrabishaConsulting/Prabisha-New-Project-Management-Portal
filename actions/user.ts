'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { ChangePasswordSchema } from '@/components/profile-module/schemas';

// THIS IS THE FIX: A dedicated schema for the server action's data.
// It correctly expects a string URL for the avatar, not a File object.
const ProfileUpdateDataSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  avatar: z.string().url("Invalid URL format.").optional().nullable(), // Expects a valid URL, optional, or null
});

export async function updateProfile(
  userId: string, 
  // The data from the client after the image has been uploaded
  values: { name: string; avatar?: string | null; }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== userId) {
    return { error: 'Unauthorized' };
  }

  // Validate the incoming data against the NEW server-side schema
  const validatedFields = ProfileUpdateDataSchema.safeParse(values);

  if (!validatedFields.success) {
    // This is where your error was coming from. It will now pass.
    console.error("Zod validation failed on server:", validatedFields.error.flatten().fieldErrors);
    return { error: 'Invalid data provided.' };
  }

  const { name, avatar } = validatedFields.data;

  // Prepare data for the database, only including avatar if it was changed
  const dataToUpdate: { name: string; avatar?: string | null } = { name };
  if (avatar !== undefined) {
    dataToUpdate.avatar = avatar;
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    revalidatePath(`/profile/${userId}`);
    revalidatePath(`/profile/${userId}/edit`);
    return { success: 'Profile updated successfully!' };
  } catch (error) {
    return { error: 'Failed to update profile.' };
  }
}

// Your `changePassword` function is correct and needs no changes.
export async function changePassword(
  userId: string,
  values: z.infer<typeof ChangePasswordSchema>
) {
  // ... (no changes needed to this function)
  const session = await getServerSession(authOptions);
  if (!session || session.user.id !== userId) {
    return { error: 'Unauthorized' };
  }
  
  const validatedFields = ChangePasswordSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: 'Invalid data.' };
  }

  const { currentPassword, newPassword } = validatedFields.data;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.password) {
    return { error: "User not found or password not set." };
  }

  const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordCorrect) {
    return { error: "Incorrect current password." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });
  
  return { success: "Password changed successfully!" };
}




// app/actions/task-action.ts

import { TaskStatus } from "@prisma/client";

// Define completed statuses - adjust these based on your actual TaskStatus enum
const COMPLETED_STATUSES: TaskStatus[] = [
  TaskStatus.DONE, // Assuming DONE is one of your statuses
  // Add any other statuses that indicate a task is completed
];

export async function getTaskCompletionTrendData(
  userId: string,
  timeRange: string = "90d",
  options?: {
    includeAssigned?: boolean; // Include tasks assigned to the user
    includeReported?: boolean; // Include tasks reported by the user
  }
) {
  // Set default options
  const { includeAssigned = true, includeReported = false } = options || {};
  
  try {
    // Calculate the start date based on timeRange
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    
    let startDate = new Date(today);
    
    switch (timeRange) {
      case "7d":
        startDate.setDate(today.getDate() - 7);
        break;
      case "14d":
        startDate.setDate(today.getDate() - 14);
        break;
      case "30d":
        startDate.setDate(today.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(today.getDate() - 90);
        break;
      default:
        startDate.setDate(today.getDate() - 90);
    }

    // Build the where clause based on options
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: today,
      }
    };
    
    if (includeAssigned && includeReported) {
      // Include both assigned and reported tasks
      whereClause.OR = [
        { assigneeId: userId },
        { reporterId: userId }
      ];
    } else if (includeAssigned) {
      // Only include assigned tasks
      whereClause.assigneeId = userId;
    } else if (includeReported) {
      // Only include reported tasks
      whereClause.reporterId = userId;
    } else {
      // If neither is specified, return empty array
      return [];
    }

    // Fetch all tasks for the user based on the filter
    const tasks = await db.task.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        assigneeId: true,
        reporterId: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // If no tasks found, return empty array
    if (tasks.length === 0) {
      return [];
    }

    // Process tasks to group by date
    const createdTasksByDate: Record<string, number> = {};
    const completedTasksByDate: Record<string, number> = {};

    tasks.forEach(task => {
      // Group created tasks by date
      const createdDate = task.createdAt.toISOString().split('T')[0];
      createdTasksByDate[createdDate] = (createdTasksByDate[createdDate] || 0) + 1;

      // Group completed tasks by date (when status is in completed state)
      if (COMPLETED_STATUSES.includes(task.status)) {
        const completedDate = task.updatedAt.toISOString().split('T')[0];
        completedTasksByDate[completedDate] = (completedTasksByDate[completedDate] || 0) + 1;
      }
    });

    // Generate all dates in the range to ensure we have data for every day
    const allDates: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split('T')[0];
      allDates.push(dateString);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Convert to sorted array and create chart data
    const chartData = allDates
      .sort()
      .map(date => ({
        date,
        created: createdTasksByDate[date] || 0,
        completed: completedTasksByDate[date] || 0,
      }));

    return chartData;
  } catch (error) {
    console.error("Error fetching task completion trend data:", error);
    return [];
  }
}