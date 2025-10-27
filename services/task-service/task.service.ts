import { db } from "@/lib/db";
import { ProjectRole, Task, TaskStatus } from "@/app/generated/client";
import { authorizeProjectMember, AuthorizationError } from "./auth.service";
import { TaskFormData } from "@/lib/zod"; // Assuming this type is defined elsewhere
import { logActivity } from "../activity-user/activity-user.service";
import { ACTIVITY_ACTIONS } from "../activity-user/helper";
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
 * Processes task updates, validates permissions, and logs status changes only.
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

  for (const task of tasksToUpdate) {
    const existingTask = existingTasksMap.get(task.id);
    if (!existingTask) continue;

    const statusHasChanged = existingTask.status !== task.status;
    const positionHasChanged = existingTask.position !== task.position;

    // Check if status changed to DONE
    const isMarkedAsDone = statusHasChanged && task.status === "DONE";
    // Check if status changed from DONE
    const isMovedFromDone =
      statusHasChanged &&
      existingTask.status === "DONE" &&
      task.status !== "DONE";

    // ✅ Only log status changes
    if (statusHasChanged) {
      if (!isProjectLead && existingTask.assigneeId !== userId) {
        throw new AuthorizationError(
          `Cannot change status for task "${existingTask.title}". You are not the assignee or a project lead.`
        );
      }

      logEntries.push({
        userId,
        projectId,
        taskId: existingTask.id,
        action: ACTIVITY_ACTIONS.UPDATE_TASK_STATUS,
        description: `Task "${existingTask.title}" status changed from ${existingTask.status} to ${task.status}.`,
        metadata: { from: existingTask.status, to: task.status },
      });
    }

    // ✅ Update DB if either status OR position changed
    if (statusHasChanged || positionHasChanged) {
      // Add completedAt information if needed
      const taskWithCompletedAt = {
        ...task,
        completedAt: isMarkedAsDone
          ? new Date()
          : isMovedFromDone
          ? null
          : undefined,
      };
      tasksThatChanged.push(taskWithCompletedAt);
    }
  }

  if (tasksThatChanged.length > 0) {
    await updateTaskOrder(tasksThatChanged);

    // ✅ Bulk insert logs (only for status changes)
    if (logEntries.length > 0) {
      await db.activityLog.createMany({
        data: logEntries.map((log) => ({
          userId: log.userId,
          projectId: log.projectId,
          taskId: log.taskId,
          action: log.action,
          description: log.description,
          metadata: log.metadata ? JSON.stringify(log.metadata) : null,
        })),
      });
    }
  }
}

/**
 * Bulk updates the order/status of multiple tasks using Prisma for better type safety.
 */
export async function updateTaskOrder(tasks: TaskUpdateData[]): Promise<void> {
  if (tasks.length === 0) return;

  // Process updates in batches for better performance
  const batchSize = 100;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    // Create update operations for each task in the batch
    const updatePromises = batch.map((task) =>
      db.task.update({
        where: { id: task.id },
        data: {
          position: task.position,
          status: task.status,
          // Only include completedAt if it's defined
          ...(task.completedAt !== undefined && {
            completedAt: task.completedAt,
          }),
        },
      })
    );

    // Execute all updates in the batch concurrently
    await Promise.all(updatePromises);
  }
}
/**
 * Handles sending notifications after a new task has been created.
 * This function now fetches the user and project details it needs.
 */
async function handlePostCreationActions(newTask: Task) {
  try {
    // 1. Fetch all required details in parallel for efficiency
    const [reporter, assignee, project] = await Promise.all([
      db.user.findUnique({ where: { id: newTask.reporterId } }),
      newTask.assigneeId
        ? db.user.findUnique({ where: { id: newTask.assigneeId } })
        : Promise.resolve(null),
      db.project.findUnique({ where: { id: newTask.projectId } }),
    ]);

    // Guard against missing critical data
    if (!reporter || !project) {
      console.error("Could not find reporter or project for the new task.");
      return;
    }

    ("/projects/cmfp2xoy30003l504pb87fdt3/task/cmftlx3o0000lwg7c9vm033w3?workspaceId=cme1bv47a0002js04h223pd0s");

    const taskUrl = `${process.env.NEXT_PUBLIC_APP_URL}/projects/${project.id}/task/${newTask.id}?workspaceId=cme1bv47a0002js04h223pd0s`;
    const iso = newTask.dueDate?.toISOString(); // string | undefined

    const dateOnlyUTC = iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          timeZone: "UTC",
        })
      : ""; // or 'TBD' / undefined depending on needs

    // "24 Sep 2025"

    // 2. Notify the Reporter (the person who created the task)
    if (reporter.email && assignee?.email) {
      await sendTaskForReviewEmail({
        reviewerName: reporter.name!,
        reviewerEmail: reporter.email,
        taskTitle: newTask.title,
        projectName: project.name,
        taskUrl,
        assignerName: assignee.name!, // The creator is the one assigning
        dueDate: dateOnlyUTC ? dateOnlyUTC : undefined,
      });
    }

    // 3. Notify the Assignee (if one was set on creation)
    if (assignee && assignee.email) {
      await sendTaskAssignmentEmail({
        assigneeName: assignee.name!,
        assigneeEmail: assignee.email,
        taskTitle: newTask.title,
        assignedBy: reporter.name!, // The creator is the one assigning
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
    // Determine the position for the new task
    const taskCount = await tx.task.count({
      where: { projectId: taskData.projectId, status: taskData.status },
    });

    const createdTask = await tx.task.create({
      data: {
        ...taskData,
        position: taskCount,
        // Set defaults if not provided
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

  // --- MODIFICATION START ---

  // Fetch user and project names for a more descriptive activity log
  const [user, project] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true }, // Select only the necessary field
    }),
    db.project.findUnique({
      where: { id: newTask.projectId },
      select: { name: true }, // Select only the necessary field
    }),
  ]);

  // Use fallback names in case they are not found
  const userName = user?.name || "A user";
  const projectName = project?.name || "the project";

  // Log the activity with the enhanced description
  await logActivity(db, {
    userId: userId,
    projectId: newTask.projectId,
    taskId: newTask.id,
    action: ACTIVITY_ACTIONS.CREATE_TASK,
    description: `${userName} created task "${newTask.title}" in ${projectName}`,
  });

  // --- MODIFICATION END ---

  await handlePostCreationActions(newTask);

  const taskWithAttachments = await db.task.findUnique({
    where: { id: newTask.id },
    include: {
      attachments: true,
    },
  });

  return taskWithAttachments;
}
