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
 * Processes task updates, validates permissions, and logs all changes.
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
  const logEntries = [];

  for (const task of tasksToUpdate) {
    const existingTask = existingTasksMap.get(task.id);
    if (!existingTask) continue;

    const statusHasChanged = existingTask.status !== task.status;
    const positionHasChanged = existingTask.position !== task.position;

    if (statusHasChanged) {
      if (!isProjectLead && existingTask.assigneeId !== userId) {
        throw new AuthorizationError(
          // FIX: Consistently use 'title' as per your Zod schema
          `Cannot change status for task "${existingTask.title}". You are not the assignee or a project lead.`
        );
      }
      logEntries.push({
        userId: userId,
        projectId: projectId,
        taskId: existingTask.id,
        action: ACTIVITY_ACTIONS.UPDATE_TASK_STATUS,
        // FIX: Consistently use 'title'
        description: `Task "${existingTask.title}" status changed from ${existingTask.status} to ${task.status}.`,
        metadata: { from: existingTask.status, to: task.status },
      });
    }

    if (positionHasChanged) {
      logEntries.push({
        userId: userId,
        projectId: projectId,
        taskId: existingTask.id,
        // FIX: Use a more appropriate action for reordering
        action: ACTIVITY_ACTIONS.UPDATE_TASK_STATUS,
        // FIX: Consistently use 'title'
        description: `Task "${existingTask.title}" was reordered.`,
        metadata: {
          field: 'position',
          from: existingTask.position,
          to: task.position,
          status: task.status,
        },
      });
    }
    
    if (statusHasChanged || positionHasChanged) {
      tasksThatChanged.push(task);
    }
  }

  if (tasksThatChanged.length > 0) {
    await updateTaskOrder(tasksThatChanged);
    const logPromises = logEntries.map(logData => logActivity(db, logData));
    await Promise.all(logPromises);
  }
}

/**
 * Updates the order/status of multiple tasks in a single transaction.
 */
export async function updateTaskOrder(tasks: TaskUpdateData[]): Promise<void> {
  await db.$transaction(async (tx) => {
    for (const taskUpdate of tasks) {
      await tx.task.update({
        where: { id: taskUpdate.id },
        data: {
          position: taskUpdate.position,
          status: taskUpdate.status,
        },
      });
    }
  });
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