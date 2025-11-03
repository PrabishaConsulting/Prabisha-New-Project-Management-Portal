import { db } from "@/lib/db";
import { ProjectRole, Task, TaskStatus } from "@/app/generated/client";
import { authorizeProjectMember, AuthorizationError } from "./auth.service";
import { TaskFormData } from "@/lib/zod";
import { logActivity } from "../activity-user/activity-user.service";
import { ACTIVITY_ACTIONS, ActivityAction } from "../activity-user/helper";
import { ProjectCreationError } from "@/utils/errors";
import {
  sendTaskAssignmentEmail,
  sendTaskForReviewEmail,
} from "../mail-service/mail-assignment.service";

type TaskUpdateData = {
  id: string;
  position: number;
  status: TaskStatus;
  completedAt?: Date | null;
};

/**
 * Processes task updates, validates permissions, and logs changes with metadata.
 * Only ONE log per task that actually changes.
 */
export async function processAndValidateTaskUpdates(
  userId: string,
  projectId: string,
  tasksToUpdate: TaskUpdateData[]
): Promise<void> {
  const userRole = await authorizeProjectMember(userId, projectId);
  const isProjectLead = userRole === ProjectRole.LEAD;

  const taskIds = tasksToUpdate.map((t) => t.id);
  const existingTasks = await db.task.findMany({
    where: { id: { in: taskIds } },
  });
  const existingTasksMap = new Map(
    existingTasks.map((task) => [task.id, task])
  );

  const tasksThatChanged: TaskUpdateData[] = [];
  const logEntries = [];

  // Get user name for logging
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  const userName = user?.name || "A user";

for (const task of tasksToUpdate) {
  const existingTask = existingTasksMap.get(task.id);
  if (!existingTask) continue;

  const statusHasChanged = existingTask.status !== task.status;
  const positionHasChanged = existingTask.position !== task.position;

  // --- AUTHORIZATION: Only for status changes ---
  if (statusHasChanged) {
    if (!isProjectLead && existingTask.assigneeId !== userId) {
      throw new AuthorizationError(
        `Cannot change status for task "${existingTask.title}". You are not the assignee or a project lead.`
      );
    }
  }

  // --- STATUS CHANGE LOGIC ---
  if (statusHasChanged) {
    const isMarkedAsDone = task.status === "DONE";
    const isMovedFromDone = existingTask.status === "DONE" && task.status !== "DONE";

    let primaryAction = ACTIVITY_ACTIONS.UPDATE_TASK_STATUS as ActivityAction; 
    let description = `${userName} changed status from ${existingTask.status} to ${task.status} for task "${existingTask.title}"`;

    if (isMarkedAsDone) {
      primaryAction = ACTIVITY_ACTIONS.COMPLETE_TASK;
      description = `${userName} completed task "${existingTask.title}"`;
    } else if (isMovedFromDone) {
      primaryAction = ACTIVITY_ACTIONS.REOPEN_TASK;
      description = `${userName} reopened task "${existingTask.title}"`;
    }

    // Create one meaningful log per task
    logEntries.push({
      userId,
      projectId,
      taskId: existingTask.id,
      action: primaryAction,
      description,
      metadata: JSON.stringify({
        status: { from: existingTask.status, to: task.status },
      }),
    });
  }

  // --- COLLECT DB UPDATES ---
  // Update only if something truly changed (status or position)
  if (statusHasChanged || positionHasChanged) {
    tasksThatChanged.push({
      id: task.id,
      status: task.status,
      position: task.position,
      completedAt:
        statusHasChanged && task.status === "DONE"
          ? new Date()
          : statusHasChanged && existingTask.status === "DONE"
          ? null
          : existingTask.completedAt,
    });
  }
}

// --- Apply DB changes efficiently ---
if (tasksThatChanged.length > 0) {
  await updateTaskOrder(tasksThatChanged);
}

// --- Bulk insert logs (status-related only) ---
if (logEntries.length > 0) {
  await db.activityLog.createMany({ data: logEntries });
}

}

/**
 * Bulk updates the order/status of multiple tasks using Prisma for better type safety.
 */
export async function updateTaskOrder(tasks: TaskUpdateData[]): Promise<void> {
  if (tasks.length === 0) return;

  const batchSize = 100;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    const updatePromises = batch.map((task) =>
      db.task.update({
        where: { id: task.id },
        data: {
          position: task.position,
          status: task.status,
          ...(task.completedAt !== undefined && {
            completedAt: task.completedAt,
          }),
        },
      })
    );

    await Promise.all(updatePromises);
  }
}

/**
 * Handles sending notifications after a new task has been created.
 */
async function handlePostCreationActions(newTask: Task) {
  try {
    const [reporter, assignee, project] = await Promise.all([
      db.user.findUnique({ where: { id: newTask.reporterId } }),
      newTask.assigneeId
        ? db.user.findUnique({ where: { id: newTask.assigneeId } })
        : Promise.resolve(null),
      db.project.findUnique({ where: { id: newTask.projectId } }),
    ]);

    if (!reporter || !project) {
      console.error("Could not find reporter or project for the new task.");
      return;
    }

    const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/task/${newTask.id}?workspaceId=cme1bv47a0002js04h223pd0s`;
    const iso = newTask.dueDate?.toISOString();

    const dateOnlyUTC = iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          timeZone: "UTC",
        })
      : "";

    // Notify the Reporter
    if (reporter.email && assignee?.email) {
      await sendTaskForReviewEmail({
        reviewerName: reporter.name!,
        reviewerEmail: reporter.email,
        taskTitle: newTask.title,
        projectName: project.name,
        taskUrl,
        assignerName: assignee.name!,
        dueDate: dateOnlyUTC ? dateOnlyUTC : undefined,
      });
    }

    // Notify the Assignee
    if (assignee && assignee.email) {
      await sendTaskAssignmentEmail({
        assigneeName: assignee.name!,
        assigneeEmail: assignee.email,
        taskTitle: newTask.title,
        assignedBy: reporter.name!,
        taskUrl,
      });
    }
  } catch (emailError) {
    console.error(
      "Failed to send notification email during task creation:",
      emailError
    );
  }
}

/**
 * Creates a new task and its attachments, then logs the creation event.
 */
export async function createTask(data: TaskFormData, userId: string) {
  const { attachments, ...taskData } = data;

  const projectMember = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: taskData.projectId, userId: userId },
    },
  });

  if (!projectMember) {
    throw new ProjectCreationError(
      "You are not authorized to create tasks in this project.",
      "FORBIDDEN"
    );
  }

  const newTask = await db.$transaction(async (tx) => {
    const taskCount = await tx.task.count({
      where: { projectId: taskData.projectId, status: taskData.status },
    });

    const createdTask = await tx.task.create({
      data: {
        ...taskData,
        position: taskCount,
        reporterId: taskData.reporterId || userId,
        assigneeId: taskData.assigneeId || undefined,
        status: taskData.status || "TO_DO",
        estimatedMinutes: taskData.estimatedMinutes,
        actualMinutes: taskData.actualMinutes || 0,
        departmentId: taskData.departmentId || undefined,
        priority: taskData.priority || "MEDIUM",
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
      },
    });

    if (attachments && attachments.length > 0) {
      await tx.taskAttachment.createMany({
        data: attachments.map((att) => ({
          ...att,
          taskId: createdTask.id,
          userId: userId,
        })),
      });
    }

    return createdTask;
  });

  // Fetch user and project names for activity log
  const [user, project] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    db.project.findUnique({
      where: { id: newTask.projectId },
      select: { name: true },
    }),
  ]);

  const userName = user?.name || "A user";
  const projectName = project?.name || "the project";

  // Fetch assignee name if exists
  let assigneeName: string | null = null;
  if (newTask.assigneeId) {
    const assignee = await db.user.findUnique({
      where: { id: newTask.assigneeId },
      select: { name: true },
    });
    assigneeName = assignee?.name || null;
  }

  // Single activity log for task creation with comprehensive metadata
  await logActivity(db, {
    userId: userId,
    projectId: newTask.projectId,
    taskId: newTask.id,
    action: ACTIVITY_ACTIONS.CREATE_TASK,
    description: `${userName} created task "${newTask.title}" in ${projectName}${assigneeName ? ` and assigned to ${assigneeName}` : ''}`,
    metadata: {
      status: newTask.status,
      priority: newTask.priority,
      assigneeId: newTask.assigneeId,
      assigneeName: assigneeName,
      dueDate: newTask.dueDate?.toISOString(),
      estimatedMinutes: newTask.estimatedMinutes,
      hasAttachments: attachments && attachments.length > 0,
      attachmentCount: attachments?.length || 0,
    },
  });

  await handlePostCreationActions(newTask);

  const taskWithAttachments = await db.task.findUnique({
    where: { id: newTask.id },
    include: {
      attachments: true,
    },
  });

  return taskWithAttachments;
}

/**
 * Deletes a task and logs the deletion.
 */
export async function deleteTask(taskId: string, userId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    throw new ProjectCreationError("Task not found.", "NOT_FOUND");
  }

  // Check authorization
  const userRole = await authorizeProjectMember(userId, task.projectId);
  const isProjectLead = userRole === ProjectRole.LEAD;

  if (!isProjectLead && task.reporterId !== userId) {
    throw new AuthorizationError(
      "You are not authorized to delete this task."
    );
  }

  // Delete the task
  await db.task.delete({
    where: { id: taskId },
  });

  // Log the deletion
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  await logActivity(db, {
    userId,
    projectId: task.projectId,
    action: ACTIVITY_ACTIONS.DELETE_TASK,
    description: `${user?.name || "A user"} deleted task "${task.title}" from ${task.project?.name || "the project"}`,
    metadata: {
      taskId: taskId,
      taskTitle: task.title,
      taskStatus: task.status,
      taskPriority: task.priority,
    },
  });

  return { success: true };
}