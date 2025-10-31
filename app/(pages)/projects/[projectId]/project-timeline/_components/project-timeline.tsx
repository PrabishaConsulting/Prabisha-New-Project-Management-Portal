// app/projects/[projectId]/_components/project-timeline.tsx
"use client";

import React, { useRef, useMemo, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import useSWRInfinite from "swr/infinite";

interface TaskActivity {
  id: string;
  type: "activity" | "comment" | "time_entry";
  date: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  action: string;
  description: string;
  metadata?: any;
}

interface TaskTimeline {
  task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    taskType?: string;
    estimatedMinutes?: number;
    actualMinutes: number;
    startDate?: string;
    dueDate?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
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

interface TimelineResult {
  tasks: TaskTimeline[];
  nextCursor?: string;
  hasMore: boolean;
}

interface ProjectTimelineProps {
  projectId: string;
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<TimelineResult> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch timeline");
  }

  return response.json();
};

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // SWR infinite hook for fetching timeline data
  const { data, error, isLoading, size, setSize, isValidating } =
    useSWRInfinite<TimelineResult>(
      (index, previousPageData) => {
        // If there's no more data, stop fetching
        if (previousPageData && !previousPageData.hasMore) return null;

        // First page doesn't have a cursor
        const cursor = index === 0 ? null : previousPageData?.nextCursor;

        // Build URL with pagination parameters
        const params = new URLSearchParams();
        if (cursor) params.append("cursor", cursor);
        params.append("limit", "5");

        return `/api/projects/${projectId}/timeline?${params.toString()}`;
      },
      fetcher,
      {
        revalidateFirstPage: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }
    );

  // Flatten all tasks from all pages
  const tasks = useMemo(() => {
    return data ? data.flatMap((page) => page.tasks) : [];
  }, [data]);

  // Check if there's more data to load
  const hasMore = data ? data[data.length - 1]?.hasMore : false;

  // Check if we're currently loading more data
  const isLoadingMore = isValidating && data && data.length > 0;

  // Load more function
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  }, [isLoadingMore, hasMore, size, setSize]);

  // Intersection Observer for infinite scroll
  React.useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMore, isLoadingMore, loadMore]);

  const getActivityIcon = (action: string) => {
    // Map actions to icons
    const actionIconMap: Record<string, string> = {
      TASK_CREATE: "✨",
      UPDATE_TASK: "✏️",
      UPDATE_TASK_STATUS: "🔄",
      UPDATE_TASK_PRIORITY: "🎯",
      UPDATE_TASK_ASSIGNEE: "👤",
      UPDATE_TASK_NAME: "📝",
      UPDATE_TASK_DESCRIPTION: "📄",
      UPDATE_TASK_DUE_DATE: "📅",
      UPDATE_TASK_TIME_ESTIMATE: "⏱️",
      COMPLETE_TASK: "✅",
      REOPEN_TASK: "🔓",
      DELETE_TASK: "🗑️",
      ADD_TASK_COMMENT: "💬",
      COMMENTED: "💬",
      TIME_LOGGED: "⏲️",
    };

    return actionIconMap[action] || "📌";
  };

  const getActivityColor = (action: string) => {
    // Map actions to colors
    const actionColorMap: Record<string, string> = {
      TASK_CREATE: "bg-green-100 text-green-800",
      UPDATE_TASK_STATUS: "bg-blue-100 text-blue-800",
      UPDATE_TASK_PRIORITY: "bg-yellow-100 text-yellow-800",
      UPDATE_TASK_ASSIGNEE: "bg-purple-100 text-purple-800",
      COMPLETE_TASK: "bg-emerald-100 text-emerald-800",
      REOPEN_TASK: "bg-orange-100 text-orange-800",
      DELETE_TASK: "bg-red-100 text-red-800",
      ADD_TASK_COMMENT: "bg-indigo-100 text-indigo-800",
      COMMENTED: "bg-indigo-100 text-indigo-800",
      TIME_LOGGED: "bg-cyan-100 text-cyan-800",
    };

    return actionColorMap[action] || " ";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TO_DO":
        return " ";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "IN_REVIEW":
        return "bg-purple-100 text-purple-800";
      case "DONE":
        return "bg-green-100 text-green-800";
      default:
        return " ";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "URGENT":
        return "bg-red-100 text-red-800";
      default:
        return " ";
    }
  };

  const formatActivityDescription = (activity: TaskActivity) => {
    // If there's metadata with specific changes, show them
    if (activity.metadata) {
      const meta = activity.metadata;

      // Status change
      if (meta.status) {
        return `Changed status from ${meta.status.from} to ${meta.status.to}`;
      }

      // Priority change
      if (meta.priority) {
        return `Changed priority from ${meta.priority.from} to ${meta.priority.to}`;
      }

      // Assignee change
      if (meta.assigneeId) {
        return `Changed assignee`;
      }

      // Comment
      if (meta.content) {
        return meta.content;
      }

      // Time logged
      if (meta.minutes) {
        return `Logged ${meta.minutes} minutes${
          meta.description ? `: ${meta.description}` : ""
        }`;
      }
    }

    // Fallback to description
    return activity.description;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <p>Failed to load timeline</p>
            <Button
              onClick={() => setSize(1)}
              variant="outline"
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          {isLoading && !data ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="">No activity yet</p>
              <p className="text-sm  mt-2">
                Activities will appear here as you work on tasks
              </p>
            </div>
          ) : (
            <div ref={scrollRef} className="space-y-6">
              {tasks.map((taskTimeline, index) => (
                <div
                  key={`${taskTimeline.task.id}-${index}`}
                  className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  {/* Task Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">
                        {taskTimeline.task.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            taskTimeline.task.status
                          )}`}
                        >
                          {taskTimeline.task.status.replace("_", " ")}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            taskTimeline.task.priority
                          )}`}
                        >
                          {taskTimeline.task.priority}
                        </span>
                        {taskTimeline.task.taskType && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium  ">
                            {taskTimeline.task.taskType}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm  ml-4">
                      <p>
                        Created{" "}
                        {formatDistanceToNow(
                          new Date(taskTimeline.task.createdAt),
                          { addSuffix: true }
                        )}
                      </p>
                      {taskTimeline.task.status === "DONE" &&
                      taskTimeline.task.completedAt ? (
                        <p className="mt-1">
                          Completed{" "}
                          {formatDistanceToNow(
                            new Date(taskTimeline.task.completedAt),
                            { addSuffix: true }
                          )}
                        </p>
                      ) : (
                        taskTimeline.task.dueDate && (
                          <p className="mt-1">
                            Due{" "}
                            {formatDistanceToNow(
                              new Date(taskTimeline.task.dueDate),
                              { addSuffix: true }
                            )}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
                    <div>
                      <p className=" font-medium mb-1">Reporter</p>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={taskTimeline.task.reporter.avatar || ""}
                            alt={taskTimeline.task.reporter.name}
                            className=" object-contain"
                          />
                          <AvatarFallback className="text-xs">
                            {taskTimeline.task.reporter.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {taskTimeline.task.reporter.name}
                        </span>
                      </div>
                    </div>

                    {taskTimeline.task.assignee && (
                      <div>
                        <p className=" font-medium mb-1">Assignee</p>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={taskTimeline.task.assignee.avatar || ""}
                              alt={taskTimeline.task.assignee.name}
                            />
                            <AvatarFallback className="text-xs">
                              {taskTimeline.task.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            {taskTimeline.task.assignee.name}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className=" font-medium mb-1">Time Tracking</p>
                      <p>
                        {taskTimeline.task.estimatedMinutes
                          ? `${taskTimeline.task.estimatedMinutes}m est. / `
                          : ""}
                        {taskTimeline.task.actualMinutes}m logged
                      </p>
                    </div>

                    {taskTimeline.task.completedAt && (
                      <div>
                        <p className=" font-medium mb-1">Completed</p>
                        <p>
                          {formatDistanceToNow(
                            new Date(taskTimeline.task.completedAt),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Activities */}
                  <div>
                    <h4 className="font-medium  mb-3 flex items-center gap-2">
                      <span>Activities</span>
                      <span className="text-xs ">
                        ({taskTimeline.activities.length})
                      </span>
                    </h4>
                    {taskTimeline.activities.length === 0 ? (
                      <p className="text-sm  italic">No activities yet</p>
                    ) : (
                      <div className="space-y-3">
                        {taskTimeline.activities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start space-x-3 p-3 rounded-lg hover: transition-colors"
                          >
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(
                                activity.action
                              )}`}
                            >
                              <span className="text-sm">
                                {getActivityIcon(activity.action)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage
                                    src={activity.user.avatar || ""}
                                    alt={activity.user.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {activity.user.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">
                                  {activity.user.name}
                                </span>
                                <span className="text-xs ">•</span>
                                <span className="text-xs ">
                                  {formatDistanceToNow(
                                    new Date(activity.date),
                                    { addSuffix: true }
                                  )}
                                </span>
                              </div>
                              <p className="text-sm ">
                                {formatActivityDescription(activity)}
                              </p>
                              {activity.action && (
                                <span className="text-xs  mt-1 inline-block">
                                  {activity.action
                                    .replace(/_/g, " ")
                                    .toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Intersection Observer Target */}
              <div ref={observerTarget} className="h-4" />

              {/* Loading indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm ">Loading more...</span>
                </div>
              )}

              {/* End of list indicator */}
              {!hasMore && tasks.length > 0 && (
                <div className="text-center py-6  border-t">
                  <p className="text-sm">
                    You've reached the end of the timeline
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
