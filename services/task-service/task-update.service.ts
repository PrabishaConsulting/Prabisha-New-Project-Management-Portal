// src/services/task.service.ts

import { db } from "@/lib/db";
import {
  Task,
  Priority,
  TaskStatus,
  TaskComment,
} from "@/app/generated/client";
import { logActivity } from "@/services/activity-user/activity-user.service";
import {
  ACTIVITY_ACTIONS,
  ActivityAction,
} from "@/services/activity-user/helper";
import {
  sendTaskAssignmentEmail,
  sendTaskForReviewEmail,
} from "@/services/mail-service/mail-assignment.service";
import { createAndBroadcastNotification } from "../notification-service/notification.service";

type UpdateTaskPayload = {
  title?: string;
  description?: string | null;
  status?: any;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: string | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
};

export const updateTaskService = async (
  taskId: string,
  updateData: UpdateTaskPayload,
  actorId: string
) => {
  // --- LOG: Initial function call ---
  console.log(`[updateTaskService] Starting update for taskId: ${taskId} by actorId: ${actorId}`);
  console.log(`[updateTaskService] UpdateData received:`, JSON.stringify(updateData, null, 2));

  // 1. Fetch the original task state
  const originalTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      project: true,
    },
  });

  if (!originalTask) {
    console.log(`[updateTaskService] ERROR: Task not found.`);
    return { error: "Task not found", status: 404 };
  }

  // --- LOG: Fetched task details ---
  console.log(`[updateTaskService] Fetched original task. Reporter ID: ${originalTask.reporter?.id}, Assignee ID: ${originalTask.assignee?.id}`);

  // 2. Authorization check
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: originalTask.projectId, userId: actorId },
    },
  });
  if (!membership) {
    console.log(`[updateTaskService] ERROR: Actor ${actorId} is not a member of project ${originalTask.projectId}.`);
    return {
      error: "Forbidden: You are not a member of this project.",
      status: 403,
    };
  }
  console.log(`[updateTaskService] Authorization successful for actor ${actorId}.`);

  // 3. Perform the database update
  const { status, ...otherData } = updateData;
  let updatedTask: Task;

  const isMarkingAsDone =
    status === TaskStatus.DONE && originalTask.status !== TaskStatus.DONE;
  const isReopeningFromDone =
    originalTask.status === TaskStatus.DONE && status !== TaskStatus.DONE;

  const additionalData: any = {};
  if (isMarkingAsDone) {
    additionalData.completedAt = new Date();
  } else if (isReopeningFromDone) {
    additionalData.completedAt = null;
  }

  if (status && status !== originalTask.status) {
    console.log(`[updateTaskService] Status is changing. Running transaction...`);
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
          ...additionalData,
        },
      });
    });
  } else {
    console.log(`[updateTaskService] Performing standard update (no status change).`);
    updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        ...otherData,
        ...additionalData,
      },
    });
  }
  console.log(`[updateTaskService] Database update successful.`);

  // 4. Log ALL changes
  await _logTaskChanges(
    originalTask,
    updateData,
    actorId,
    isMarkingAsDone,
    isReopeningFromDone
  );

  // 5. Handle side-effects like notifications
  await handlePostUpdateActions(originalTask, updatedTask, actorId);

  // --- REVISED NOTIFICATION LOGIC ---

  const statusChanged = status && status !== originalTask.status;
  const assigneeChanged =
    updateData.assigneeId && updateData.assigneeId !== originalTask.assigneeId;
  const priorityChanged =
    updateData.priority && updateData.priority !== originalTask.priority;
  const titleChanged =
    updateData.title && updateData.title !== originalTask.title;
  const descriptionChanged =
    updateData.description &&
    updateData.description !== originalTask.description;

  const somethingChanged =
    statusChanged ||
    assigneeChanged ||
    priorityChanged ||
    titleChanged ||
    descriptionChanged;

  // --- LOG: Change detection ---
  console.log(`[updateTaskService] Change detection results:`);
  console.log(`  - statusChanged: ${statusChanged}`);
  console.log(`  - assigneeChanged: ${assigneeChanged}`);
  console.log(`  - priorityChanged: ${priorityChanged}`);
  console.log(`  - titleChanged: ${titleChanged}`);
  console.log(`  - descriptionChanged: ${descriptionChanged}`);
  console.log(`  - Final 'somethingChanged' value: ${somethingChanged}`);

  if (somethingChanged) {
    const recipients = new Set<string>();

    // --- LOG: Building recipient list ---
    if (originalTask.reporter?.id && originalTask.reporter.id !== actorId) {
      console.log(`[updateTaskService] Adding reporter ${originalTask.reporter.id} to recipients.`);
      recipients.add(originalTask.reporter.id);
    } else {
      console.log(`[updateTaskService] Reporter not added (either null or is the actor).`);
    }

    if (originalTask.assignee?.id && originalTask.assignee.id !== actorId) {
      console.log(`[updateTaskService] Adding assignee ${originalTask.assignee.id} to recipients.`);
      recipients.add(originalTask.assignee.id);
    } else {
      console.log(`[updateTaskService] Assignee not added (either null or is the actor).`);
    }

    // Only send a notification if there are valid recipients
    if (recipients.size > 0) {
      const notificationPayload = {
        type: "TASK_UPDATED",
        message: `Task "${originalTask.title}" was updated.`,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${originalTask.projectId}/task/${originalTask.id}`,
        recipients: Array.from(recipients),
      };

      // --- LOG: Before sending notification ---
      console.log(`[updateTaskService] Preparing to send notification. Payload:`, JSON.stringify(notificationPayload, null, 2));

      await createAndBroadcastNotification(notificationPayload);

      // --- LOG: After sending notification ---
      console.log(`[updateTaskService] Notification dispatched successfully.`);
    } else {
      // --- LOG: No recipients found ---
      console.log(`[updateTaskService] No valid recipients found. Skipping notification.`);
    }
  } else {
    // --- LOG: No changes detected ---
    console.log(`[updateTaskService] No meaningful changes detected. Skipping notification.`);
  }

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

    if (!actor) return;

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
        // --- IN-APP NOTIFICATION ---
        await createAndBroadcastNotification({
          type: "TASK_ASSIGNED",
          message: `${actor.name} assigned you the task "${updatedTask.title}".`,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${updatedTask.projectId}/task/${updatedTask.id}`,
          recipients: [newAssignee.id],
        });
        console.log(`[handlePostUpdateActions] Sent assignment email and notification to ${newAssignee.name}`);
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
        // --- IN-APP NOTIFICATION ---
        if (originalTask.reporter.id) {
          await createAndBroadcastNotification({
            type: "TASK_READY_FOR_REVIEW",
            message: `${actor.name} marked "${updatedTask.title}" as ready for your review.`,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${updatedTask.projectId}/task/${updatedTask.id}`,
            recipients: [originalTask.reporter.id],
          });
        }
        console.log(`[handlePostUpdateActions] Sent review email and notification to reporter ${originalTask.reporter.name}`);
      }
    }
  } catch (emailError) {
    console.error("Failed to send notification email:", emailError);
  }
}

async function _logTaskChanges(
  originalTask: any,
  updateData: UpdateTaskPayload,
  actorId: string,
  isMarkingAsDone: boolean,
  isReopeningFromDone: boolean
) {
  // Track all changes
  const changes: Record<string, { from: any; to: any }> = {};
  const changedFields: string[] = [];

  // Determine the primary action based on what changed
  let primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK as ActivityAction;

  // Check each field for changes
  if (
    updateData.status !== undefined &&
    updateData.status !== originalTask.status
  ) {
    changes.status = { from: originalTask.status, to: updateData.status };
    changedFields.push("status");

    // Set more specific action for status changes
    if (isMarkingAsDone) {
      primaryAction = ACTIVITY_ACTIONS.COMPLETE_TASK;
    } else if (isReopeningFromDone) {
      primaryAction = ACTIVITY_ACTIONS.REOPEN_TASK;
    } else {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_STATUS;
    }
  }

  if (
    updateData.priority !== undefined &&
    updateData.priority !== originalTask.priority
  ) {
    changes.priority = { from: originalTask.priority, to: updateData.priority };
    changedFields.push("priority");

    // If only priority changed, use specific action
    if (changedFields.length === 1) {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_PRIORITY;
    }
  }

  if (
    updateData.assigneeId !== undefined &&
    updateData.assigneeId !== originalTask.assigneeId
  ) {
    changes.assigneeId = {
      from: originalTask.assigneeId,
      to: updateData.assigneeId,
    };
    changedFields.push("assignee");

    // If only assignee changed, use specific action
    if (changedFields.length === 1) {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_ASSIGNEE;
    }
  }

  if (
    updateData.title !== undefined &&
    updateData.title !== originalTask.title
  ) {
    changes.title = { from: originalTask.title, to: updateData.title };
    changedFields.push("title");

    // If only title changed, use specific action
    if (changedFields.length === 1) {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_NAME;
    }
  }

  if (
    updateData.description !== undefined &&
    updateData.description !== originalTask.description
  ) {
    changes.description = {
      from: originalTask.description,
      to: updateData.description,
    };
    changedFields.push("description");

    // If only description changed, use specific action
    if (changedFields.length === 1) {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_DESCRIPTION;
    }
  }

  if (
    updateData.dueDate !== undefined &&
    updateData.dueDate !== originalTask.dueDate?.toISOString()
  ) {
    changes.dueDate = {
      from: originalTask.dueDate?.toISOString(),
      to: updateData.dueDate,
    };
    changedFields.push("due date");

    // If only due date changed, use specific action
    if (changedFields.length === 1) {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_DUE_DATE;
    }
  }

  if (
    updateData.estimatedMinutes !== undefined &&
    updateData.estimatedMinutes !== originalTask.estimatedMinutes
  ) {
    changes.estimatedMinutes = {
      from: originalTask.estimatedMinutes,
      to: updateData.estimatedMinutes,
    };
    changedFields.push("estimated time");

    // If only time estimate changed, use specific action
    if (
      changedFields.length === 1 ||
      (changedFields.length === 2 && changedFields.includes("actual time"))
    ) {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_TIME_ESTIMATE;
    }
  }

  if (
    updateData.actualMinutes !== undefined &&
    updateData.actualMinutes !== originalTask.actualMinutes
  ) {
    changes.actualMinutes = {
      from: originalTask.actualMinutes,
      to: updateData.actualMinutes,
    };
    changedFields.push("actual time");

    // If only actual time changed, use specific action
    if (changedFields.length === 1) {
      primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_TIME_ESTIMATE;
    }
  }

  // Only log if there are actual changes
  if (Object.keys(changes).length === 0) {
    return;
  }

  // Fetch actor name
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { name: true },
  });
  const actorName = actor?.name || "A user";

  // Create a human-readable description based on primary action
  let description: string;

  if (primaryAction === ACTIVITY_ACTIONS.COMPLETE_TASK) {
    description = `${actorName} completed task "${originalTask.title}"`;
  } else if (primaryAction === ACTIVITY_ACTIONS.REOPEN_TASK) {
    description = `${actorName} reopened task "${originalTask.title}"`;
  } else if (changedFields.length === 1) {
    description = `${actorName} updated ${changedFields[0]} for task "${originalTask.title}"`;
  } else {
    description = `${actorName} updated ${changedFields.join(", ")} for task "${
      originalTask.title
    }"`;
  }

  // Log a single activity with all changes in metadata
  await logActivity(db, {
    userId: actorId,
    projectId: originalTask.projectId,
    taskId: originalTask.id,
    action: primaryAction,
    description: description,
    metadata: changes,
  });
}

export const updateTaskStatus = async (
  taskId: string,
  newStatus: TaskStatus,
  actorId: string,
  comment?: string,
  actualMinutes?: number // ✅ Add this param
): Promise<{ task: Task | null; error: string | null }> => {
  try {
    // --- Fetch full task details for notifications ---
    const originalTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true } },
        assignee: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    });

    if (!originalTask) {
      return { task: null, error: `Task with ID '${taskId}' not found.` };
    }

    const isMarkingAsDone =
      newStatus === TaskStatus.DONE && originalTask.status !== TaskStatus.DONE;
    const isReopeningFromDone =
      originalTask.status === TaskStatus.DONE && newStatus !== TaskStatus.DONE;

    const additionalData: any = {};

    if (isMarkingAsDone) {
      additionalData.completedAt = new Date();
      if (typeof actualMinutes === "number") {
        additionalData.actualMinutes = actualMinutes;
      }
    } else if (isReopeningFromDone) {
      additionalData.completedAt = null;
      additionalData.actualMinutes = 0;
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        ...additionalData,
      },
    });

    // --- NOTIFICATION & ACTIVITY LOGIC ---
    if (originalTask.status !== newStatus) {
      const actor = await db.user.findUnique({
        where: { id: actorId },
        select: { name: true },
      });
      const actorName = actor?.name || "A user";

      // Determine the correct action
      let action = ACTIVITY_ACTIONS.UPDATE_TASK_STATUS as ActivityAction;
      let description = `${actorName} changed status to ${newStatus} for task "${originalTask.title}"`;
      let notificationMessage = `Task "${originalTask.title}" status was changed to ${newStatus}.`;

      if (isMarkingAsDone) {
        action = ACTIVITY_ACTIONS.COMPLETE_TASK;
        description = `${actorName} completed task "${originalTask.title}"`;
        notificationMessage = `${actorName} completed the task "${originalTask.title}".`;
      } else if (isReopeningFromDone) {
        action = ACTIVITY_ACTIONS.REOPEN_TASK;
        description = `${actorName} reopened task "${originalTask.title}"`;
        notificationMessage = `${actorName} reopened the task "${originalTask.title}".`;
      }

      await logActivity(db, {
        userId: actorId,
        projectId: originalTask.projectId,
        taskId: originalTask.id,
        action: action,
        description: description,
        metadata: {
          status: { from: originalTask.status, to: newStatus },
        },
      });

      // --- SEND IN-APP NOTIFICATION ---
      const recipients = new Set<string>();
      if (originalTask.reporter?.id && originalTask.reporter.id !== actorId) {
        recipients.add(originalTask.reporter.id);
      }
      if (originalTask.assignee?.id && originalTask.assignee.id !== actorId) {
        recipients.add(originalTask.assignee.id);
      }

      if (recipients.size > 0) {
        await createAndBroadcastNotification({
          type: "TASK_STATUS_UPDATED",
          message: notificationMessage,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${originalTask.projectId}/task/${originalTask.id}`,
          recipients: Array.from(recipients),
        });
        console.log(
          `[updateTaskStatus] Sent status update notification to ${Array.from(
            recipients
          ).join(", ")}`
        );
      }
    }

    // Add comment if task is marked as done
    if (comment && comment.trim() !== "") {
      const commentResult = await addTaskCommentService(
        taskId,
        actorId,
        comment
      );
      if (commentResult.error) {
        console.error(
          `Failed to add comment for task ${taskId}:`,
          commentResult.error
        );
      }
    }

    return { task: updatedTask, error: null };
  } catch (error: any) {
    console.error(`Failed to update status for task ${taskId}:`, error);

    if (error.code === "P2025") {
      return { task: null, error: `Task with ID '${taskId}' not found.` };
    }

    return {
      task: null,
      error: "An unexpected error occurred while updating the task.",
    };
  }
};

export const updateTaskTime = async (
  taskId: string,
  estimatedMinutes?: number | null,
  actualMinutes?: number | null
): Promise<{ task: Task | null; error: string | null }> => {
  try {
    const originalTask = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        projectId: true,
        estimatedMinutes: true,
        actualMinutes: true,
      },
    });

    if (!originalTask) {
      return { task: null, error: `Task with ID '${taskId}' not found.` };
    }

    const updateData: any = {};
    const changes: Record<string, { from: any; to: any }> = {};

    if (estimatedMinutes !== undefined) {
      updateData.estimatedMinutes = estimatedMinutes;
      changes.estimatedMinutes = {
        from: originalTask.estimatedMinutes,
        to: estimatedMinutes,
      };
    }
    if (actualMinutes !== undefined) {
      updateData.actualMinutes = actualMinutes;
      changes.actualMinutes = {
        from: originalTask.actualMinutes,
        to: actualMinutes,
      };
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Log time estimate changes
    if (Object.keys(changes).length > 0) {
      await logActivity(db, {
        userId: originalTask.id, // You may want to pass userId as parameter
        projectId: originalTask.projectId,
        taskId: originalTask.id,
        action: ACTIVITY_ACTIONS.UPDATE_TASK_TIME_ESTIMATE,
        description: `Time estimates updated for task "${originalTask.title}"`,
        metadata: changes,
      });
    }

    return { task: updatedTask, error: null };
  } catch (error: any) {
    console.error(`Failed to update time for task ${taskId}:`, error);

    if (error.code === "P2025") {
      return { task: null, error: `Task with ID '${taskId}' not found.` };
    }

    return {
      task: null,
      error: "An unexpected error occurred while updating the task time.",
    };
  }
};

export const canUserAccessTask = async (
  taskId: string,
  userId: string
): Promise<{
  authorized: boolean;
  error: string | null;
  projectId?: string;
  workspaceId?: string;
  reason?: "NOT_FOUND" | "FORBIDDEN" | "INTERNAL_SERVER_ERROR";
}> => {
  try {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        assigneeId: true,
        reporterId: true,
        project: {
          select: {
            id: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!task) {
      return {
        authorized: false,
        error: "Task not found.",
        reason: "NOT_FOUND",
      };
    }

    const isAssignee = task.assigneeId === userId;
    const isReporter = task.reporterId === userId;

    if (isAssignee || isReporter) {
      return {
        authorized: true,
        error: null,
        projectId: task.project?.id,
        workspaceId: task.project?.workspaceId,
      };
    } else {
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
    // Get task details for logging and notifications
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        projectId: true,
        reporterId: true,
        assigneeId: true,
      },
    });

    if (!task) {
      return { comment: null, error: "Task not found." };
    }

    const comment = await db.taskComment.create({
      data: {
        taskId,
        userId,
        content,
      },
    });

    // --- NOTIFICATION LOGIC ---
    const actor = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const actorName = actor?.name || "A user";

    // Find all other commenters on this task to notify them
    const otherCommenters = await db.taskComment.findMany({
      where: { taskId, userId: { not: userId } },
      select: { userId: true },
      distinct: ["userId"],
    });

    const recipients = new Set<string>();
    if (task.reporterId && task.reporterId !== userId) {
      recipients.add(task.reporterId);
    }
    if (task.assigneeId && task.assigneeId !== userId) {
      recipients.add(task.assigneeId);
    }
    otherCommenters.forEach((c) => recipients.add(c.userId));

    if (recipients.size > 0) {
      await createAndBroadcastNotification({
        type: "TASK_COMMENT_ADDED",
        message: `${actorName} commented on "${task.title}"`,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${task.projectId}/task/${task.id}?commentId=${comment.id}`,
        recipients: Array.from(recipients),
      });
      console.log(
        `[addTaskCommentService] Sent comment notification to ${Array.from(
          recipients
        ).join(", ")}`
      );
    }

    // Log comment addition
    await logActivity(db, {
      userId,
      projectId: task.projectId,
      taskId: task.id,
      action: ACTIVITY_ACTIONS.ADD_TASK_COMMENT,
      description: `${actorName} added a comment to task "${
        task.title
      }"`,
      metadata: {
        commentId: comment.id,
        commentLength: content.length,
      },
    });

    return { comment, error: null };
  } catch (error: any) {
    console.error(`Failed to add comment for task ${taskId}:`, error);
    return { comment: null, error: "Failed to add comment." };
  }
};