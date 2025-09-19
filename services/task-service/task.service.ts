import { db } from '@/lib/db';
import { ProjectRole, Task, TaskStatus } from '@prisma/client';
import { authorizeProjectMember, AuthorizationError } from './auth.service';
import { TaskFormData } from '@/lib/zod'; // Assuming this type is defined elsewhere
import { logActivity } from '../activity-user/activity-user.service';
import { ACTIVITY_ACTIONS } from '../activity-user/helper';
import { ProjectCreationError } from '@/utils/errors';

type TaskUpdateData = {
  id: string;
  position: number;
  status: TaskStatus;
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
  const existingTasksMap = new Map(existingTasks.map((task) => [task.id, task]));

  const tasksThatChanged: TaskUpdateData[] = [];
  const logEntries: LogParams[] = [];

  for (const task of tasksToUpdate) {
    const existingTask = existingTasksMap.get(task.id);
    if (!existingTask) continue;

    const statusHasChanged = existingTask.status !== task.status;
    const positionHasChanged = existingTask.position !== task.position;

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
      tasksThatChanged.push(task);
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
 * Bulk updates the order/status of multiple tasks using CASE WHEN for performance.
 */
export async function updateTaskOrder(tasks: TaskUpdateData[]): Promise<void> {
  if (tasks.length === 0) return;

  // Build CASE WHEN statements for position and status
  const positionCases = tasks
    .map((t) => `WHEN id = '${t.id}' THEN ${t.position}`)
    .join(" ");

  const statusCases = tasks
    .map((t) => `WHEN id = '${t.id}' THEN '${t.status}'`)
    .join(" ");

  const taskIds = tasks.map((t) => `'${t.id}'`).join(",");

  // ✅ Single query to update all tasks
  await db.$executeRawUnsafe(`
    UPDATE tasks
    SET 
      position = CASE ${positionCases} ELSE position END,
      status   = CASE ${statusCases} ELSE status END
    WHERE id IN (${taskIds});
  `);
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
      'You are not authorized to create tasks in this project.',
      'FORBIDDEN'
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
        priority: taskData.priority || 'MEDIUM', 
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
  const userName = user?.name || 'A user';
  const projectName = project?.name || 'the project';

  // Log the activity with the enhanced description
  await logActivity(db, {
    userId: userId,
    projectId: newTask.projectId,
    taskId: newTask.id,
    action: ACTIVITY_ACTIONS.CREATE_TASK,
    description: `${userName} created task "${newTask.title}" in ${projectName}`,
  });
  
  // --- MODIFICATION END ---

  const taskWithAttachments = await db.task.findUnique({
    where: { id: newTask.id },
    include: {
      attachments: true,
    },
  });

  return taskWithAttachments;
}