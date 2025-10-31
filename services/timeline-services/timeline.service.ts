// services/timeline-services/timeline.service.ts
import { db } from "@/lib/db";

export interface TaskActivity {
  id: string;
  type: 'activity' | 'comment' | 'time_entry';
  date: Date;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  action: string; // The actual action from ActivityLog
  description: string;
  metadata?: any; // Parsed metadata
}

export interface TaskTimeline {
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    taskType?: string;
    estimatedMinutes?: number;
    actualMinutes: number;
    startDate: Date | null;
    dueDate: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    reporter: {
      id: string;
      name: string;
      avatar: string | null;
    };
    assignee?: {
      id: string;
      name: string;
      avatar: string | null;
    };
  };
  activities: TaskActivity[];
}

export interface TimelineFilters {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  assigneeId?: string;
  action?: string; // Filter by specific action
}

export interface TimelinePaginationOptions {
  cursor?: string;
  limit?: number;
}

export interface TimelineResult {
  tasks: TaskTimeline[];
  nextCursor?: string;
  hasMore: boolean;
}

// Get project timeline with all activities grouped by task
export async function getProjectTimeline(
  projectId: string,
  filters: TimelineFilters = {},
  pagination: TimelinePaginationOptions = {}
): Promise<TimelineResult> {
  const { cursor, limit = 20 } = pagination;
  const { userId, dateFrom, dateTo, status, assigneeId, action } = filters;

  // Build activity log query conditions
  const activityWhere: any = { projectId };
  
  if (userId) activityWhere.userId = userId;
  if (action) activityWhere.action = action;
  if (dateFrom || dateTo) {
    activityWhere.createdAt = {};
    if (dateFrom) activityWhere.createdAt.gte = dateFrom;
    if (dateTo) activityWhere.createdAt.lte = dateTo;
  }
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!activityWhere.createdAt) activityWhere.createdAt = {};
    activityWhere.createdAt.lt = cursorDate;
  }

  // Fetch all activity logs for the project
  const allActivities = await db.activityLog.findMany({
    where: activityWhere,
    include: { 
      user: { select: { id: true, name: true, avatar: true } },
      task: {
        include: {
          reporter: { select: { id: true, name: true, avatar: true } },
          assignee: { select: { id: true, name: true, avatar: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group activities by taskId
  const activitiesByTask = new Map<string, typeof allActivities>();
  
  for (const activity of allActivities) {
    if (activity.taskId && activity.task) {
      if (!activitiesByTask.has(activity.taskId)) {
        activitiesByTask.set(activity.taskId, []);
      }
      activitiesByTask.get(activity.taskId)!.push(activity);
    }
  }

  // Get unique task IDs and filter by status/assignee if needed
  let taskIds = Array.from(activitiesByTask.keys());
  
  if (status || assigneeId) {
    const taskFilter: any = { id: { in: taskIds } };
    if (status) taskFilter.status = status;
    if (assigneeId) taskFilter.assigneeId = assigneeId;
    
    const filteredTasks = await db.task.findMany({
      where: taskFilter,
      select: { id: true }
    });
    
    taskIds = filteredTasks.map(t => t.id);
  }

  // Apply pagination to task list
  const paginatedTaskIds = taskIds.slice(0, limit + 1);
  const hasMore = paginatedTaskIds.length > limit;
  const finalTaskIds = hasMore ? paginatedTaskIds.slice(0, limit) : paginatedTaskIds;

  // Build timeline for each task
  const taskTimelines: TaskTimeline[] = await Promise.all(
    finalTaskIds.map(async (taskId) => {
      const taskActivities = activitiesByTask.get(taskId) || [];
      const task = taskActivities[0]?.task;

      if (!task) {
        // Fallback: fetch task if not in activities
        const fetchedTask = await db.task.findUnique({
          where: { id: taskId },
          include: {
            reporter: { select: { id: true, name: true, avatar: true } },
            assignee: { select: { id: true, name: true, avatar: true } }
          }
        });
        
        if (!fetchedTask) throw new Error(`Task ${taskId} not found`);
        
        return {
          task: mapTaskData(fetchedTask),
          activities: []
        };
      }

      // Fetch comments for this task
      const comments = await db.taskComment.findMany({
        where: { 
          taskId,
          ...(userId && { userId })
        },
        include: { 
          user: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch time entries for this task
      const timeEntries = await db.timeEntry.findMany({
        where: { 
          taskId,
          ...(userId && { userId })
        },
        include: { 
          user: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { date: 'desc' }
      });

      // Convert activity logs to task activities
      const activityActivities: TaskActivity[] = taskActivities.map(log => {
        let parsedMetadata: any = {};
        
        try {
          if (log.metadata) {
            parsedMetadata = JSON.parse(log.metadata);
          }
        } catch (e) {
          console.error('Failed to parse activity log metadata:', e);
        }

        return {
          id: `activity-${log.id}`,
          type: 'activity' as const,
          date: log.createdAt,
          userId: log.userId,
          user: log.user,
          action: log.action,
          description: log.description || log.action,
          metadata: parsedMetadata
        };
      });

      // Convert comments to task activities
      const commentActivities: TaskActivity[] = comments.map(comment => ({
        id: `comment-${comment.id}`,
        type: 'comment' as const,
        date: comment.createdAt,
        userId: comment.userId,
        user: comment.user,
        action: 'COMMENTED',
        description: `Commented on task`,
        metadata: {
          content: comment.content,
          commentId: comment.id
        }
      }));

      // Convert time entries to task activities
      const timeActivities: TaskActivity[] = timeEntries.map(entry => ({
        id: `time-${entry.id}`,
        type: 'time_entry' as const,
        date: entry.date,
        userId: entry.userId,
        user: entry.user,
        action: 'TIME_LOGGED',
        description: `Logged ${entry.minutes} minutes`,
        metadata: {
          minutes: entry.minutes,
          description: entry.description,
          timeEntryId: entry.id
        }
      }));

      // Combine all activities and sort by date (newest first)
      const activities = [...activityActivities, ...commentActivities, ...timeActivities]
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      return {
        task: mapTaskData(task),
        activities
      };
    })
  );

  // Get next cursor from the last activity of the last task
  let nextCursor: string | undefined;
  if (hasMore && taskTimelines.length > 0) {
    const lastTask = taskTimelines[taskTimelines.length - 1];
    if (lastTask.activities.length > 0) {
      nextCursor = lastTask.activities[0].date.toISOString();
    }
  }

  return {
    tasks: taskTimelines,
    nextCursor,
    hasMore
  };
}

// Get task timeline with all activities for a specific task
export async function getTaskTimeline(taskId: string): Promise<TaskTimeline> {
  // Fetch the task
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { 
      reporter: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } }
    }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Fetch ALL activity logs for this task (no filtering by action type)
  const activityLogs = await db.activityLog.findMany({
    where: { taskId },
    include: { 
      user: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch comments for this task
  const comments = await db.taskComment.findMany({
    where: { taskId },
    include: { 
      user: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch time entries for this task
  const timeEntries = await db.timeEntry.findMany({
    where: { taskId },
    include: { 
      user: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { date: 'desc' }
  });

  // Convert activity logs to task activities
  const activityActivities: TaskActivity[] = activityLogs.map(log => {
    let parsedMetadata: any = {};
    
    try {
      if (log.metadata) {
        parsedMetadata = JSON.parse(log.metadata);
      }
    } catch (e) {
      console.error('Failed to parse activity log metadata:', e);
    }

    return {
      id: `activity-${log.id}`,
      type: 'activity' as const,
      date: log.createdAt,
      userId: log.userId,
      user: log.user,
      action: log.action,
      description: log.description || log.action,
      metadata: parsedMetadata
    };
  });

  // Convert comments to task activities
  const commentActivities: TaskActivity[] = comments.map(comment => ({
    id: `comment-${comment.id}`,
    type: 'comment' as const,
    date: comment.createdAt,
    userId: comment.userId,
    user: comment.user,
    action: 'COMMENTED',
    description: `Commented on task`,
    metadata: {
      content: comment.content,
      commentId: comment.id
    }
  }));

  // Convert time entries to task activities
  const timeActivities: TaskActivity[] = timeEntries.map(entry => ({
    id: `time-${entry.id}`,
    type: 'time_entry' as const,
    date: entry.date,
    userId: entry.userId,
    user: entry.user,
    action: 'TIME_LOGGED',
    description: `Logged ${entry.minutes} minutes`,
    metadata: {
      minutes: entry.minutes,
      description: entry.description,
      timeEntryId: entry.id
    }
  }));

  // Combine all activities and sort by date (newest first)
  const activities = [...activityActivities, ...commentActivities, ...timeActivities]
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    task: mapTaskData(task),
    activities
  };
}

// Helper function to map task data consistently
function mapTaskData(task: any) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    taskType: task.taskType || "",
    estimatedMinutes: task.estimatedMinutes || undefined,
    actualMinutes: task.actualMinutes,
    startDate: task.startDate ?? null,
    dueDate: task.dueDate ?? null,
    completedAt: task.completedAt ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    reporter: task.reporter,
    assignee: task.assignee || undefined
  };
}