// components/ProjectBoard.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import {
  type Task,
  type ProjectMember,
  type User,
  type Project,
  TaskStatus,
} from "@prisma/client";
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
import { ProjectTable } from "./project-table";
import { Button } from "@/components/ui/button";
// ✨ 1. ADD NEW IMPORTS
import { LayoutGrid, List, CalendarDays } from "lucide-react";
import { differenceInDays, isPast, isToday } from "date-fns";
import { type Department } from "@prisma/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProjectContext } from "@/context/project-context";

const BOARD_COLUMNS = [
  { title: "To Do", status: TaskStatus.TODO },
  { title: "In Progress", status: TaskStatus.IN_PROGRESS },
  { title: "In Review", status: TaskStatus.REVIEW },
  { title: "Done", status: TaskStatus.DONE },
];

type TaskWithAssignee = Task & {
  assignee: { id: string; name: string | null; avatar: string | null } | null;
};
type MemberWithUser = ProjectMember & { user: User };
// ✨ Make sure the `dueDate` property is available on your BoardData type
type BoardData = Project & {
  tasks: TaskWithAssignee[];
  members: MemberWithUser[];
};

interface ProjectBoardProps {
  projectId: string;
  currentUserId: string;
  departments: Department[];
  
}

export default function ProjectBoard({
  projectId,
  currentUserId,
  departments,
}: ProjectBoardProps) {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [originalTaskPosition, setOriginalTaskPosition] = useState<{
    status: TaskStatus;
    index: number;
  } | null>(null);

  const fetchBoardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/board-data`);
      if (!response.ok) throw new Error("Failed to fetch board data");
      const data: BoardData = await response.json();
      setBoardData(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load project board.");
      setBoardData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchBoardData();
  }, [projectId]);

  // ✨ 2. ADD DUE DATE STATUS FUNCTION
  const getDueDateStatus = () => {
    if (!boardData?.dueDate) {
      return null;
    }
    const dueDate = new Date(boardData.dueDate);
    const today = new Date();
    const daysLeft = differenceInDays(dueDate, today);

    if (isToday(dueDate)) {
      return (
        <span className="flex items-center gap-2 text-sm font-bold text-amber-500">
          <CalendarDays className="h-4 w-4" />
          Due Today
        </span>
      );
    }

    if (isPast(dueDate)) {
      return (
        <span className="flex items-center gap-2 text-sm font-bold text-red-500">
          <CalendarDays className="h-4 w-4" />
          {Math.abs(daysLeft)} {Math.abs(daysLeft) === 1 ? "day" : "days"}{" "}
          overdue
        </span>
      );
    }

    return (
      <span className="flex items-center gap-2 text-sm font-bold text-green-600">
        <CalendarDays className="h-4 w-4" />
        {daysLeft + 1} {daysLeft + 1 === 1 ? "day" : "days"} left
      </span>
    );
  };

  const tasksByStatus = useMemo(() => {
    const initial: Record<TaskStatus, TaskWithAssignee[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };
    if (!boardData) return initial;

    return boardData.tasks.reduce((acc, task) => {
      if (task.status) {
        (acc[task.status] = acc[task.status] || []).push(task);
      }
      return acc;
    }, initial);
  }, [boardData]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    })
  );

  const contextValue = useMemo(() => {
    if (!boardData) {
      return null;
    }
    return {
      workspaceId: boardData.workspaceId, // We know this is a string here
      projectId,
    };
  }, [boardData, projectId]); // Dependency is now the whole boardData object

  const handleTaskCreated = (newTask: TaskWithAssignee) => {
    setBoardData((prev) => {
      if (!prev) return null;
      const updatedTasks = [newTask, ...prev.tasks];
      return { ...prev, tasks: updatedTasks };
    });
    toast.success("Task created successfully!");
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    if (!boardData) return;
    const previousBoardData = { ...boardData };
    setBoardData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
      };
    });

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }
      toast.success("Task updated successfully!");
      fetchBoardData();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred during update.");
      }
      setBoardData(previousBoardData);
    }
  };

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Task") {
      const task = event.active.data.current.task as TaskWithAssignee;
      setActiveTask(task);

      const status = task.status;
      const index =
        tasksByStatus[status]?.findIndex((t) => t.id === task.id) ?? -1;
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

    setBoardData((board) => {
      if (!board) return null;

      const activeTaskIndex = board.tasks.findIndex((t) => t.id === active.id);
      if (activeTaskIndex === -1) return board;

      let overStatus: TaskStatus;
      const isOverAColumn = over.data.current?.type === "Column";
      const isOverATask = over.data.current?.type === "Task";

      if (isOverAColumn) {
        overStatus = over.id as TaskStatus;
      } else if (isOverATask && over.data.current?.task) {
        overStatus = over.data.current.task.status;
      } else {
        return board;
      }

      const activeTask = board.tasks[activeTaskIndex];

      if (activeTask.status !== overStatus) {
        const newTasks = [...board.tasks];
        newTasks[activeTaskIndex] = {
          ...newTasks[activeTaskIndex],
          status: overStatus,
        };
        return { ...board, tasks: newTasks };
      }

      if (isOverATask) {
        const overTaskIndex = board.tasks.findIndex((t) => t.id === over.id);
        if (
          activeTaskIndex !== overTaskIndex &&
          board.tasks[activeTaskIndex].status ===
            board.tasks[overTaskIndex].status
        ) {
          const reorderedTasks = arrayMove(
            board.tasks,
            activeTaskIndex,
            overTaskIndex
          );
          return { ...board, tasks: reorderedTasks };
        }
      }

      return board;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);

    const { active, over } = event;
    if (!over || !originalTaskPosition || !boardData) {
      setOriginalTaskPosition(null);
      return;
    }

    const finalTasksState = boardData.tasks;
    const movedTask = finalTasksState.find((t) => t.id === active.id);

    if (!movedTask) {
      setOriginalTaskPosition(null);
      return;
    }

    const finalStatus = movedTask.status;
    const tasksInFinalColumn = finalTasksState.filter(
      (t) => t.status === finalStatus
    );
    const finalIndex = tasksInFinalColumn.findIndex((t) => t.id === active.id);

    if (
      originalTaskPosition.status === finalStatus &&
      originalTaskPosition.index === finalIndex
    ) {
      setOriginalTaskPosition(null);
      return;
    }

    setOriginalTaskPosition(null);

    const tasksToUpdate = tasksInFinalColumn.map((task, index) => ({
      id: task.id,
      status: task.status,
      position: index,
    }));

    try {
      if (tasksToUpdate.length > 0) {
        const response = await fetch("/api/tasks/update-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: tasksToUpdate,
            column: finalStatus,
            projectId: projectId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(
            errorData.error || "An unknown error occurred."
          );
          throw error;
        }

        const result = await response.json();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save task arrangement."
      );
      fetchBoardData();
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-foreground">
        Loading Board...
      </div>
    );
  }
  if (!boardData) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        Failed to load project data.
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={contextValue}>
      <div className=" h-full flex flex-col bg-background text-foreground">
        {/* ✨ 3. UPDATE THE HEADER TO DISPLAY THE STATUS */}
        {/* <header className="flex items-center justify-between mb-4 pb-2 border-b"> */}
          {/* <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{boardData.name} Board</h1>
            {/* {getDueDateStatus()} */}
          {/* </div> */}
          {/* <div className="flex items-center gap-2 p-1 bg-muted rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("board")}
              className={cn(
                "flex items-center gap-2 px-3",
                viewMode === "board"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-2 px-3",
                viewMode === "table"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <List className="h-4 w-4" />
              Table
            </Button>
          </div> */}
        {/* </header> */}

        {viewMode === "board" ? (
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
                  projectId={projectId}
                  currentUserId={currentUserId}
                  members={boardData.members}
                  onTaskCreated={handleTaskCreated}
                  departments={departments}
                />
              ))}
            </main>
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
        ) : (
          <main className="flex-1 overflow-y-auto">
            <ProjectTable
              tasks={boardData.tasks}
              onTaskUpdate={handleTaskUpdate}
            />
          </main>
        )}
      </div>
    </ProjectContext.Provider>
  );
}
