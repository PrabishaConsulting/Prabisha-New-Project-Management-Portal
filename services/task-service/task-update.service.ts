// src/services/task.service.ts

import { db } from "@/lib/db";
import { Task, Priority, TaskStatus , TaskComment} from "@prisma/client";
import { logActivity } from "@/services/activity-user/activity-user.service";
import { ACTIVITY_ACTIONS } from "@/services/activity-user/helper";
import {
  sendTaskAssignmentEmail,
  sendTaskForReviewEmail,
} from "@/services/mail-service/mail-assignment.service";

type UpdateTaskPayload = {
  title?: string;
  description?: string | null;
  status?: any;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: string | null;
  estimatedMinutes?: number | null; // Added estimated time in minutes
  actualMinutes?: number | null;    // Added actual time in minutes
};

export const updateTaskService = async (
  taskId: string,
  updateData: UpdateTaskPayload,
  actorId: string
) => {
  // 1. Fetch the original task state for comparison and authorization
  const originalTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { name: true } },
      project: true, // <-- FIX: Include the full project object
    },
  });

  if (!originalTask) {
    return { error: "Task not found", status: 404 };
  }

  // 2. Authorization check
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: originalTask.projectId, userId: actorId },
    },
  });
  if (!membership) {
    return {
      error: "Forbidden: You are not a member of this project.",
      status: 403,
    };
  }

  // 3. Perform the database update
  const { status, ...otherData } = updateData;
  let updatedTask: Task;

  // Check if status is changing to DONE
  const isMarkingAsDone = status === TaskStatus.DONE && originalTask.status !== TaskStatus.DONE;
  
  // Check if status is changing from DONE to something else
  const isReopeningFromDone = originalTask.status === TaskStatus.DONE && status !== TaskStatus.DONE;
  
  // Prepare additional data for the update
  const additionalData: any = {};
  
  if (isMarkingAsDone) {
    // Set completedAt timestamp when marking as done
    additionalData.completedAt = new Date();
  } else if (isReopeningFromDone) {
    // Clear completedAt timestamp when reopening from done
    additionalData.completedAt = null;
  }

  if (status && status !== originalTask.status) {
    // Transaction for when the status (and therefore position) changes
    updatedTask = await db.$transaction(async (tx) => {
      const newPosition = await tx.task.count({
        where: { projectId: originalTask.projectId, status: status as any },
      });
      return tx.task.update({
        where: { id: taskId },
        data: { 
          ...otherData, 
          status, 
          position: newPosition,
          ...additionalData
        },
      });
    });
  } else {
    // Standard update for all other fields
    updatedTask = await db.task.update({
      where: { id: taskId },
      data: { 
        ...otherData,
        ...additionalData
      },
    });
  }

  // 4. Handle side-effect: Activity Logging
  await _logTaskChanges(originalTask, { ...updateData, status }, actorId);
  await handlePostUpdateActions(originalTask, updatedTask, actorId);

  return { data: updatedTask };
};

async function handlePostUpdateActions(
  originalTask: any,
  updatedTask: Task,
  actorId: string
) {
  try {
    const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/all-task`;
    const actor = await db.user.findUnique({ where: { id: actorId } });

    if (!actor) return "Deva";

    // Notification for new assignee
    if (
      updatedTask.assigneeId &&
      updatedTask.assigneeId !== originalTask.assigneeId
    ) {
      const newAssignee = await db.user.findUnique({
        where: { id: updatedTask.assigneeId },
      });
      if (newAssignee?.email) {
        await sendTaskAssignmentEmail({
          assigneeName: newAssignee.name!,
          assigneeEmail: newAssignee.email,
          taskTitle: updatedTask.title,
          assignedBy: actor.name!,
          taskUrl,
        });
      }
    }

    // Notification for task ready for review
    if (
      updatedTask.status === TaskStatus.REVIEW &&
      originalTask.status !== TaskStatus.REVIEW
    ) {
      if (originalTask.reporter?.email) {
        await sendTaskForReviewEmail({
          reviewerName: originalTask.reporter.name!,
          reviewerEmail: originalTask.reporter.email,
          taskTitle: updatedTask.title,
          projectName: originalTask.assignee?.name || "The assignee",
          taskUrl,
          assignerName: actor.name!,
          dueDate: updatedTask.dueDate?.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            timeZone: "UTC",
          }),
        });
      }
    }
  } catch (emailError) {
    console.error("Failed to send notification email:", emailError);
    // Do not block the API response if email fails
  }
}

async function _logTaskChanges(
  originalTask: any,
  updateData: UpdateTaskPayload,
  actorId: string
) {
  // Determine if a loggable change occurred (status, priority, assignee, or time estimates).
  const hasLoggableChanges =
    (updateData.status && updateData.status !== originalTask.status) ||
    (updateData.priority && updateData.priority !== originalTask.priority) ||
    (updateData.assigneeId !== undefined &&
      updateData.assigneeId !== originalTask.assigneeId) ||
    (updateData.estimatedMinutes !== undefined &&
      updateData.estimatedMinutes !== originalTask.estimatedMinutes) ||
    (updateData.actualMinutes !== undefined &&
      updateData.actualMinutes !== originalTask.actualMinutes);

  // Only log if one of the specified fields has changed.
  if (hasLoggableChanges) {
    const actor = await db.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    const actorName = actor?.name || "A user";

    // Create a single, simple description.
    const description = `${actorName} updated the task "${originalTask.title}".`;

    await logActivity(db, {
      userId: actorId,
      projectId: originalTask.projectId,
      taskId: originalTask.id,
      action: ACTIVITY_ACTIONS.UPDATE_TASK_STATUS,
      description: description,
    });
  }
}

export const updateTaskStatus = async (
  taskId: string,
  newStatus: TaskStatus,
  actorId: string,
  comment?: string
): Promise<{ task: Task | null; error: string | null }> => {
  try {
    // 1. Find the original task to check current status
    const originalTask = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!originalTask) {
      return { task: null, error: `Task with ID '${taskId}' not found.` };
    }

    // 2. Check if status is changing to DONE
    const isMarkingAsDone = newStatus === TaskStatus.DONE && originalTask.status !== TaskStatus.DONE;
    
    // 3. Check if status is changing from DONE to something else
    const isReopeningFromDone = originalTask.status === TaskStatus.DONE && newStatus !== TaskStatus.DONE;
    
    // 4. Prepare additional data for the update
    const additionalData: any = {};
    
    if (isMarkingAsDone) {
      // Set completedAt timestamp when marking as done
      additionalData.completedAt = new Date();
    } else if (isReopeningFromDone) {
      // Clear completedAt timestamp when reopening from done
      additionalData.completedAt = null;
    }

    // 5. Update the task with the new status and any additional data
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        ...additionalData
      },
    });

    // 6. If task is marked as done and comment is provided, add the comment
    if (isMarkingAsDone && comment && comment.trim() !== "") {
      const commentResult = await addTaskCommentService(taskId, actorId, comment);
      if (commentResult.error) {
        console.error(`Failed to add comment for task ${taskId}:`, commentResult.error);
        // We don't fail the status update if comment fails, but we log it
      }
    }

    // 7. If successful, return the updated task and a null error
    return { task: updatedTask, error: null };
  } catch (error: any) {
    // 8. Handle potential errors
    console.error(`Failed to update status for task ${taskId}:`, error);

    // Prisma throws a specific error code 'P2025' if the record to update is not found
    if (error.code === "P2025") {
      return { task: null, error: `Task with ID '${taskId}' not found.` };
    }

    // For all other errors, return a generic error message
    return {
      task: null,
      error: "An unexpected error occurred while updating the task.",
    };
  }
};


/**
 * Updates the time estimates for a specific task.
 * @param {string} taskId - The ID of the task to update.
 * @param {number} estimatedMinutes - The estimated time in minutes.
 * @param {number} actualMinutes - The actual time spent in minutes.
 * @returns {Promise<{ task: Task | null; error: string | null }>} - An object containing the updated task on success, or an error message on failure.
 */
export const updateTaskTime = async (
  taskId: string,
  estimatedMinutes?: number | null,
  actualMinutes?: number | null
): Promise<{ task: Task | null; error: string | null }> => {
  try {
    // Prepare update data
    const updateData: any = {};
    if (estimatedMinutes !== undefined) updateData.estimatedMinutes = estimatedMinutes;
    if (actualMinutes !== undefined) updateData.actualMinutes = actualMinutes;
    
    // Update the task with the new time estimates
    const updatedTask = await db.task.update({
      where: {
        id: taskId,
      },
      data: updateData,
    });

    // If successful, return the updated task and a null error
    return { task: updatedTask, error: null };
  } catch (error: any) {
    // Handle potential errors
    console.error(`Failed to update time for task ${taskId}:`, error);

    // Prisma throws a specific error code 'P2025' if the record to update is not found
    if (error.code === "P2025") {
      return { task: null, error: `Task with ID '${taskId}' not found.` };
    }

    // For all other errors, return a generic error message
    return {
      task: null,
      error: "An unexpected error occurred while updating the task time.",
    };
  }
};

/**
 * Checks if a user is authorized to access a task.
 * Authorization is granted if the user is the task's assignee or its reporter.
 * @param {string} taskId - The ID of the task to check.
 * @param {string} userId - The ID of the user requesting access.
 * @returns {Promise<{ authorized: boolean; error: string | null; reason?: 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL_SERVER_ERROR' }>}
 * An object indicating if the user is authorized and providing an error message if not.
 */
export const canUserAccessTask = async (
  taskId: string,
  userId: string
): Promise<{
  authorized: boolean;
  error: string | null;
  reason?: "NOT_FOUND" | "FORBIDDEN" | "INTERNAL_SERVER_ERROR";
}> => {
  try {
    // 1. Fetch only the necessary IDs for the authorization check
    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        assigneeId: true,
        reporterId: true,
      },
    });

    // 2. Handle case where the task does not exist
    if (!task) {
      return {
        authorized: false,
        error: "Task not found.",
        reason: "NOT_FOUND",
      };
    }

    // 3. Perform the authorization check
    const isAssignee = task.assigneeId === userId;
    const isReporter = task.reporterId === userId;

    if (isAssignee || isReporter) {
      // 4. User is authorized, return success
      return { authorized: true, error: null };
    } else {
      // 5. User is not the assignee or reporter, return forbidden
      return {
        authorized: false,
        error: "User is not authorized to access this task.",
        reason: "FORBIDDEN",
      };
    }
  } catch (error) {
    console.error(
      `Authorization check failed for task ${taskId} and user ${userId}:`,
      error
    );
    return {
      authorized: false,
      error: "An unexpected error occurred.",
      reason: "INTERNAL_SERVER_ERROR",
    };
  }
};


export const addTaskCommentService = async (
  taskId: string,
  userId: string,
  content: string
): Promise<{ comment: TaskComment | null; error: string | null }> => {
  try {
    const comment = await db.taskComment.create({
      data: {
        taskId,
        userId,
        content,
      },
    });
    return { comment, error: null };
  } catch (error: any) {
    console.error(`Failed to add comment for task ${taskId}:`, error);
    return { comment: null, error: "Failed to add comment." };
  }
};