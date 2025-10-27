// services/timelineService.ts
import { db } from "@/lib/db";

export interface TimelineEvent {
  id: string;
  type: 'project_created' | 'task_created' | 'status_changed' | 'comment' | 'time_entry' | 'task_assigned';
  date: Date;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  projectId: string;
  taskId?: string;
  description: string;
  details?: {
    action?: string;
    oldStatus?: string;
    newStatus?: string;
    content?: string;
    minutes?: number;
    timeDescription?: string;
    assignee?: string;
  };
}

// Get project timeline with all activities, comments, and time entries
export async function getProjectTimeline(projectId: string): Promise<any> {
  // Fetch all activity logs for the project
  const activityLogs = await db.activityLog.findMany({
    where: { projectId },
    include: { 
      user: { select: { id: true, name: true, avatar: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch all tasks in the project
  const tasks = await db.task.findMany({
    where: { projectId },
    include: { 
      reporter: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } }
    }
  });

  const taskIds = tasks.map(task => task.id);

  // Fetch all comments for tasks in this project
  const comments = await db.taskComment.findMany({
    where: { taskId: { in: taskIds } },
    include: { 
      user: { select: { id: true, name: true, avatar: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch all time entries for tasks in this project
  const timeEntries = await db.timeEntry.findMany({
    where: { taskId: { in: taskIds } },
    include: { 
      user: { select: { id: true, name: true, avatar: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { date: 'desc' }
  });

  // Convert activity logs to timeline events
  const activityEvents: any = activityLogs.map(log => {
    let details = {};
    let eventType: TimelineEvent['type'] = 'status_changed';
    
    try {
      if (log.metadata) {
        const parsed = JSON.parse(log.metadata);
        details = {
          action: log.action,
          oldStatus: parsed.oldStatus,
          newStatus: parsed.newStatus,
          comment: parsed.comment,
          assignee: parsed.assignee
        };
        
        // Determine event type based on action
        if (log.action === 'PROJECT_CREATED') {
          eventType = 'project_created';
        } else if (log.action === 'TASK_CREATED') {
          eventType = 'task_created';
        } else if (log.action === 'TASK_ASSIGNED') {
          eventType = 'task_assigned';
        }
      }
    } catch (e) {
      console.error('Failed to parse activity log metadata', e);
    }

    return {
      id: `activity-${log.id}`,
      type: eventType,
      date: log.createdAt,
      userId: log.userId,
      user: log.user,
      projectId: log.projectId,
      taskId: log.taskId,
      description: log.description || `${log.action} ${log.task ? `on task "${log.task.title}"` : ''}`,
      details
    };
  });

  // Convert task creation events (if not already captured in activity logs)
  const taskCreationEvents: any = tasks.map(task => ({
    id: `task-created-${task.id}`,
    type: 'task_created' as const,
    date: task.createdAt,
    userId: task.reporterId,
    user: task.reporter,
    projectId,
    taskId: task.id,
    description: `Created task "${task.title}"`
  }));

  // Convert comments to timeline events
  const commentEvents: any = comments.map(comment => ({
    id: `comment-${comment.id}`,
    type: 'comment' as const,
    date: comment.createdAt,
    userId: comment.userId,
    user: comment.user,
    projectId,
    taskId: comment.taskId,
    description: `Commented on task "${comment.task.title}"`,
    details: {
      content: comment.content
    }
  }));

  // Convert time entries to timeline events
  const timeEvents: any = timeEntries.map(entry => ({
    id: `time-${entry.id}`,
    type: 'time_entry' as const,
    date: entry.date,
    userId: entry.userId,
    user: entry.user,
    projectId,
    taskId: entry.taskId,
    description: `Logged ${entry.minutes} minutes on task "${entry.task.title}"`,
    details: {
      minutes: entry.minutes,
      timeDescription: entry.description
    }
  }));

  // Combine all events and sort by date (newest first)
  return [...activityEvents, ...taskCreationEvents, ...commentEvents, ...timeEvents]
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

// Get task timeline with all activities, comments, and time entries for a specific task
export async function getTaskTimeline(taskId: string): Promise<any> {
  // Fetch the task to get projectId
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { 
      reporter: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      project: { select: { id: true } }
    }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Fetch all activity logs for this task
  const activityLogs = await db.activityLog.findMany({
    where: { taskId },
    include: { 
      user: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch all comments for this task
  const comments = await db.taskComment.findMany({
    where: { taskId },
    include: { 
      user: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch all time entries for this task
  const timeEntries = await db.timeEntry.findMany({
    where: { taskId },
    include: { 
      user: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { date: 'desc' }
  });

  // Convert task creation event
  const taskCreationEvent: TimelineEvent = {
    id: `task-created-${task.id}`,
    type: 'task_created',
    date: task.createdAt,
    userId: task.reporterId,
    user: task.reporter,
    projectId: task.projectId,
    taskId: task.id,
    description: `Created task "${task.title}"`
  };

  // Convert activity logs to timeline events
  const activityEvents: any = activityLogs.map(log => {
    let details = {};
    let eventType: TimelineEvent['type'] = 'status_changed';
    
    try {
      if (log.metadata) {
        const parsed = JSON.parse(log.metadata);
        details = {
          action: log.action,
          oldStatus: parsed.oldStatus,
          newStatus: parsed.newStatus,
          comment: parsed.comment,
          assignee: parsed.assignee
        };
        
        // Determine event type based on action
        if (log.action === 'TASK_ASSIGNED') {
          eventType = 'task_assigned';
        }
      }
    } catch (e) {
      console.error('Failed to parse activity log metadata', e);
    }

    return {
      id: `activity-${log.id}`,
      type: eventType,
      date: log.createdAt,
      userId: log.userId,
      user: log.user,
      projectId: task.projectId,
      taskId: task.id,
      description: log.description || `${log.action} on task "${task.title}"`,
      details
    };
  });

  // Convert comments to timeline events
  const commentEvents: any = comments.map(comment => ({
    id: `comment-${comment.id}`,
    type: 'comment' as const,
    date: comment.createdAt,
    userId: comment.userId,
    user: comment.user,
    projectId: task.projectId,
    taskId: task.id,
    description: `Commented on task "${task.title}"`,
    details: {
      content: comment.content
    }
  }));

  // Convert time entries to timeline events
  const timeEvents: any = timeEntries.map(entry => ({
    id: `time-${entry.id}`,
    type: 'time_entry' as const,
    date: entry.date,
    userId: entry.userId,
    user: entry.user,
    projectId: task.projectId,
    taskId: task.id,
    description: `Logged ${entry.minutes} minutes on task "${task.title}"`,
    details: {
      minutes: entry.minutes,
      timeDescription: entry.description
    }
  }));

  // Combine all events and sort by date (newest first)
  return [taskCreationEvent, ...activityEvents, ...commentEvents, ...timeEvents]
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}