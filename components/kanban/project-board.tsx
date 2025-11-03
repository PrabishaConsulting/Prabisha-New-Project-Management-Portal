"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  type Task,
  type ProjectMember,
  type User,
  type Project,
  type Department,
  TaskStatus,
} from "@/app/generated/client";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { KanbanColumn } from "./kanban-column";
import { SortableTaskCard } from "./sortable-task-card";
import { toast } from "sonner";
import { ProjectContext } from "@/context/project-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTaskTimer } from "@/hooks/useTaskTimer";
import useSWRInfinite from "swr/infinite";

const BOARD_COLUMNS = [
  { title: "To Do", status: TaskStatus.TO_DO },
  { title: "In Progress", status: TaskStatus.IN_PROGRESS },
  { title: "In Review", status: TaskStatus.REVIEW },
  { title: "Done", status: TaskStatus.DONE },
];

type TaskWithAssignee = Task & {
  assignee: { id: string; name: string | null; avatar: string | null } | null;
};
type MemberWithUser = ProjectMember & { user: User };

interface BoardData {
  project: Project & {
    members: MemberWithUser[];
  };
  tasks: TaskWithAssignee[];
  taskCounts: Record<string, number>;
  pagination: {
    page: number;
    limit: number;
    totalTasks: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface ProjectBoardProps {
  projectId: string;
  currentUserId: string;
  departments: Department[];
}

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProjectBoard({
  projectId,
  currentUserId,
  departments,
}: ProjectBoardProps) {
  // SWR Infinite hook for paginated data
  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<BoardData>(
    (pageIndex) => `/api/projects/${projectId}/board?page=${pageIndex + 1}&limit=20`,
    fetcher,
    {
      revalidateFirstPage: false,
    }
  );

  // Extract data from SWR
  const boardData = data ? data[0] : null;
  const tasks = data ? data.flatMap(page => page.tasks) : [];
  const taskCounts = data ? data[0]?.taskCounts : {};
  const isLoadingInitialData = !data && !error;
  const isLoadingMore = isValidating && data && data.length === size;
  const isEmpty = data?.[0]?.tasks.length === 0;
  const isReachingEnd = data && data[data.length - 1]?.pagination.hasNextPage === false;

  // State for drag and drop
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [originalTaskPosition, setOriginalTaskPosition] = useState<{
    status: TaskStatus;
    index: number;
  } | null>(null);

  // Dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    taskId: string;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    tasksToUpdate: Array<{ id: string; status: TaskStatus; position: number }>;
  } | null>(null);
  const [statusComment, setStatusComment] = useState("");
  const [actualTime, setActualTime] = useState<number>(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Observer ref for infinite scroll
  const observerRef = useRef<HTMLDivElement | null>(null);

  const { getTimerForTask } = useTaskTimer();

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!observerRef.current || isReachingEnd || isLoadingMore) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setSize(prevSize => prevSize + 1);
      }
    }, { threshold: 0.1 });
    
    if (observerRef.current) observer.observe(observerRef.current);
    
    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [isReachingEnd, isLoadingMore, setSize]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const initial: Record<TaskStatus, TaskWithAssignee[]> = {
      TO_DO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };
    
    return tasks.reduce((acc, task) => {
      (acc[task.status] = acc[task.status] || []).push(task);
      return acc;
    }, initial);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    })
  );

  const contextValue = useMemo(() => {
    if (!boardData) return null;
    return {
      workspaceId: boardData.project.workspaceId,
      projectId,
    };
  }, [boardData, projectId]);

  const handleTaskCreated = (newTask: TaskWithAssignee) => {
    // Optimistically update the UI
    mutate(data => {
      if (!data) return data;
      const updatedFirstPage = {
        ...data[0],
        tasks: [newTask, ...data[0].tasks],
        taskCounts: {
          ...data[0].taskCounts,
          [newTask.status]: (data[0].taskCounts[newTask.status] || 0) + 1
        }
      };
      return [updatedFirstPage, ...data.slice(1)];
    }, false);
    
    toast.success("Task created successfully!");
  };

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Task") {
      const task = event.active.data.current.task as TaskWithAssignee;
      setActiveTask(task);
      const status = task.status;
      const index = tasksByStatus[status]?.findIndex((t) => t.id === task.id) ?? -1;
      if (index !== -1) {
        setOriginalTaskPosition({ status, index });
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !over.data.current || active.id === over.id) return;
    const isActiveATask = active.data.current?.type === "Task";
    if (!isActiveATask) return;

    mutate(data => {
      if (!data) return data;
      
      // Create a deep copy of the data
      const newData = data.map(page => ({
        ...page,
        tasks: [...page.tasks]
      }));

      // Find the active task in the pages
      let activeTask: TaskWithAssignee | null = null;
      let activePageIndex = -1;
      let activeTaskIndex = -1;

      for (let i = 0; i < newData.length; i++) {
        const taskIndex = newData[i].tasks.findIndex(t => t.id === active.id);
        if (taskIndex !== -1) {
          activeTask = newData[i].tasks[taskIndex];
          activePageIndex = i;
          activeTaskIndex = taskIndex;
          break;
        }
      }

      if (!activeTask) return data;

      let overStatus: TaskStatus;
      const isOverAColumn = over.data.current?.type === "Column";
      const isOverATask = over.data.current?.type === "Task";

      if (isOverAColumn) {
        overStatus = over.id as TaskStatus;
      } else if (isOverATask && over.data.current?.task) {
        overStatus = over.data.current.task.status;
      } else {
        return data;
      }

      // If dragging over a different column, update the task's status
      if (activeTask.status !== overStatus) {
        newData[activePageIndex].tasks[activeTaskIndex] = {
          ...activeTask,
          status: overStatus
        };
      } 
      // If dragging over a task in the same column, reorder
      else if (isOverATask) {
        const overTaskId = over.id;
        let overPageIndex = -1;
        let overTaskIndex = -1;

        for (let i = 0; i < newData.length; i++) {
          const index = newData[i].tasks.findIndex(t => t.id === overTaskId);
          if (index !== -1) {
            overPageIndex = i;
            overTaskIndex = index;
            break;
          }
        }

        if (overPageIndex === -1 || overTaskIndex === -1) return data;

        // If the active task and over task are in the same page, reorder within the page
        if (activePageIndex === overPageIndex) {
          const reorderedTasks = arrayMove(
            newData[activePageIndex].tasks,
            activeTaskIndex,
            overTaskIndex
          );
          newData[activePageIndex].tasks = reorderedTasks;
        }
      }

      return newData;
    }, false);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !originalTaskPosition || !boardData) {
      setOriginalTaskPosition(null);
      return;
    }

    const allTasks = tasks;
    const movedTask = allTasks.find((t) => t.id === active.id);
    if (!movedTask) {
      setOriginalTaskPosition(null);
      return;
    }

    const finalStatus = movedTask.status;
    const tasksInFinalColumn = allTasks.filter((t) => t.status === finalStatus);
    const finalIndex = tasksInFinalColumn.findIndex((t) => t.id === active.id);

    const statusChanged = originalTaskPosition.status !== finalStatus;

    if (
      originalTaskPosition.status === finalStatus &&
      originalTaskPosition.index === finalIndex
    ) {
      setOriginalTaskPosition(null);
      return;
    }

    const tasksToUpdate = tasksInFinalColumn.map((task, index) => ({
      id: task.id,
      status: task.status,
      position: index,
    }));

    if (statusChanged) {
      const timer = getTimerForTask(movedTask.id);
      const elapsedMinutes = timer ? Math.round(timer.totalElapsed / 60) : 0;
      setActualTime(elapsedMinutes);

      setPendingStatusChange({
        taskId: movedTask.id,
        oldStatus: originalTaskPosition.status,
        newStatus: finalStatus,
        tasksToUpdate,
      });
      setIsStatusDialogOpen(true);
      setOriginalTaskPosition(null);
      return;
    }

    setOriginalTaskPosition(null);
    await updateTaskOrder(tasksToUpdate, finalStatus);
  }

  const updateTaskOrder = async (
    tasksToUpdate: Array<{ id: string; status: TaskStatus; position: number }>,
    column: TaskStatus
  ) => {
    try {
      if (tasksToUpdate.length > 0) {
        const response = await fetch("/api/tasks/update-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks: tasksToUpdate, column, projectId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "An unknown error occurred.");
        }
        
        // Refetch data after successful update
        mutate();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save task arrangement."
      );
      mutate();
    }
  };

  const handleStatusChangeConfirm = async () => {
    if (!pendingStatusChange || !statusComment.trim()) return;
    setIsUpdatingStatus(true);

    try {
      const statusResponse = await fetch(
        `/api/tasks/${pendingStatusChange.taskId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: pendingStatusChange.newStatus,
            comment: statusComment,
            actualTime:
              pendingStatusChange.newStatus === TaskStatus.DONE
                ? actualTime
                : undefined,
          }),
        }
      );

      if (!statusResponse.ok) throw new Error("Failed to update status");
      await updateTaskOrder(
        pendingStatusChange.tasksToUpdate,
        pendingStatusChange.newStatus
      );

      toast.success(`Status updated to ${pendingStatusChange.newStatus}`);
      mutate();

      setIsStatusDialogOpen(false);
      setStatusComment("");
      setActualTime(0);
      setPendingStatusChange(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
      mutate();
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusChangeCancel = () => {
    setIsStatusDialogOpen(false);
    setStatusComment("");
    setActualTime(0);
    setPendingStatusChange(null);
    mutate();
  };

  if (isLoadingInitialData) {
    return (
      <div className="flex h-full items-center justify-center text-foreground">
        Loading Board...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        Failed to load project data.
      </div>
    );
  }
  
  if (!boardData) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        No project data available.
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className="h-full flex flex-col bg-background text-foreground">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          collisionDetection={closestCorners}
        >
          <main className="flex-1 flex gap-6 p-4 overflow-x-auto">
            {BOARD_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                column={col}
                tasks={tasksByStatus[col.status] || []}
                taskCount={taskCounts[col.status] || 0}
                projectId={projectId}
                currentUserId={currentUserId}
                members={boardData.project.members}
                onTaskCreated={handleTaskCreated}
                departments={departments}
              />
            ))}
          </main>

          <div ref={observerRef} className="h-10" />
          {isLoadingMore && (
            <div className="flex justify-center py-4 text-sm text-muted-foreground">
              Loading more tasks...
            </div>
          )}
          {isReachingEnd && (
            <div className="flex justify-center py-4 text-sm text-muted-foreground">
              No more tasks to load
            </div>
          )}

          {createPortal(
            <DragOverlay>
              {activeTask ? (
                <div className="shadow-2xl rounded-lg transform scale-105">
                  <SortableTaskCard task={activeTask} isOverlay />
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>

        {/* Status Change Comment Dialog */}
        <Dialog
          open={isStatusDialogOpen}
          onOpenChange={(open) => {
            if (!isUpdatingStatus && !open) handleStatusChangeCancel();
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Update Task Status</DialogTitle>
              <DialogDescription>
                Please add a comment about this status change.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label htmlFor="statusComment">Comment *</Label>
              <Textarea
                id="statusComment"
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                className="min-h-[120px]"
                placeholder="Describe the change or completion details..."
                disabled={isUpdatingStatus}
                autoFocus
              />
            </div>

            {pendingStatusChange?.newStatus === TaskStatus.DONE && (
              <div className="mt-4">
                <Label htmlFor="actualTime">Actual Time (minutes)</Label>
                <input
                  type="number"
                  id="actualTime"
                  value={actualTime}
                  onChange={(e) => setActualTime(Number(e.target.value))}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm"
                  min={0}
                  disabled={isUpdatingStatus}
                />
              </div>
            )}

            <DialogFooter className="gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleStatusChangeCancel}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusChangeConfirm}
                disabled={!statusComment.trim() || isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProjectContext.Provider>
  );
}