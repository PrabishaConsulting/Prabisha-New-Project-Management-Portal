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

export interface TimelineFilters {
  type?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TimelinePaginationOptions {
  cursor?: string; // ISO date string for cursor-based pagination
  limit?: number;
}

export interface TimelineResult {
  events: any[];
  nextCursor?: string; // ISO date string for next page
  hasMore: boolean;
}

// Get project timeline with pagination and filtering
export async function getProjectTimeline(
  projectId: string,
  filters: TimelineFilters = {},
  pagination: TimelinePaginationOptions = {}
): Promise<TimelineResult> {
  const { cursor, limit = 20 } = pagination;
  const { type, userId, dateFrom, dateTo } = filters;

  // Build base query conditions
  const whereConditions: any = { projectId };
  
  if (type) whereConditions.type = type;
  if (userId) whereConditions.userId = userId;
  if (dateFrom || dateTo) {
    whereConditions.date = {};
    if (dateFrom) whereConditions.date.gte = dateFrom;
    if (dateTo) whereConditions.date.lte = dateTo;
  }

  // Add cursor condition if provided
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!whereConditions.date) whereConditions.date = {};
    whereConditions.date.lt = cursorDate;
  }

  // Fetch all activity logs for the project with pagination
  const activityLogs = await db.activityLog.findMany({
    where: whereConditions,
    include: { 
      user: { select: { id: true, name: true, avatar: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Take one extra to check if there are more
  });

  // Fetch tasks with pagination and filtering
  const tasksWhere: any = { projectId };
  if (dateFrom || dateTo) {
    tasksWhere.createdAt = {};
    if (dateFrom) tasksWhere.createdAt.gte = dateFrom;
    if (dateTo) tasksWhere.createdAt.lte = dateTo;
  }
  
  const tasks = await db.task.findMany({
    where: tasksWhere,
    include: { 
      reporter: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const taskIds = tasks.map(task => task.id);

  // Fetch comments with pagination and filtering
  const commentsWhere: any = { taskId: { in: taskIds } };
  if (userId) commentsWhere.userId = userId;
  if (dateFrom || dateTo) {
    commentsWhere.createdAt = {};
    if (dateFrom) commentsWhere.createdAt.gte = dateFrom;
    if (dateTo) commentsWhere.createdAt.lte = dateTo;
  }

  const comments = await db.taskComment.findMany({
    where: commentsWhere,
    include: { 
      user: { select: { id: true, name: true, avatar: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  // Fetch time entries with pagination and filtering
  const timeEntriesWhere: any = { taskId: { in: taskIds } };
  if (userId) timeEntriesWhere.userId = userId;
  if (dateFrom || dateTo) {
    timeEntriesWhere.date = {};
    if (dateFrom) timeEntriesWhere.date.gte = dateFrom;
    if (dateTo) timeEntriesWhere.date.lte = dateTo;
  }

  const timeEntries = await db.timeEntry.findMany({
    where: timeEntriesWhere,
    include: { 
      user: { select: { id: true, name: true, avatar: true } },
      task: { select: { id: true, title: true } }
    },
    orderBy: { date: 'desc' },
    take: limit + 1,
  });

  // Convert activity logs to timeline events
  const activityEvents: any[] = activityLogs.map(log => {
    let details: any = {};
    let eventType: any['type'] = 'status_changed';
    
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
  const taskCreationEvents: any[] = tasks.map(task => ({
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
  const commentEvents: any[] = comments.map(comment => ({
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
  const timeEvents: any[] = timeEntries.map(entry => ({
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

  // Combine all events
  const allEvents = [...activityEvents, ...taskCreationEvents, ...commentEvents, ...timeEvents];
  
  // Apply filters if they weren't applied at the database level
  let filteredEvents = allEvents;
  if (type) {
    filteredEvents = filteredEvents.filter(event => event.type === type);
  }
  if (userId) {
    filteredEvents = filteredEvents.filter(event => event.userId === userId);
  }
  
  // Sort by date (newest first)
  filteredEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Apply pagination
  const startIndex = cursor ? filteredEvents.findIndex(event => event.date < new Date(cursor)) : 0;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limit + 1);
  
  // Check if there are more items
  const hasMore = paginatedEvents.length > limit;
  const events = hasMore ? paginatedEvents.slice(0, limit) : paginatedEvents;
  
  // Get the cursor for the next page
  const nextCursor = hasMore ? events[events.length - 1].date.toISOString() : undefined;

  return {
    events,
    nextCursor,
    hasMore
  };
}

// Get task timeline with all activities, comments, and time entries for a specific task
export async function getTaskTimeline(taskId: string): Promise<any[]> {
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
  const taskCreationEvent: any = {
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
  const activityEvents: any[] = activityLogs.map(log => {
    let details: any = {};
    let eventType: any['type'] = 'status_changed';
    
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
  const commentEvents: any[] = comments.map(comment => ({
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
  const timeEvents: any[] = timeEntries.map(entry => ({
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