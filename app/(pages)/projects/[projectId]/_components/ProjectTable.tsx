// components/ProjectBoard.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import {
  type Task,
  type ProjectMember,
  type User,
  type Project,
} from "@/app/generated/client";
import { ProjectTable } from "@/components/kanban/project-table";
import { toast } from "sonner";
import { ProjectContext } from "@/context/project-context";


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
}

export default function ProjectList({
  projectId,
  currentUserId,
}: ProjectBoardProps) {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);


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


  const contextValue = useMemo(() => {
    if (!boardData) {
      return null;
    }
    return {
      workspaceId: boardData.workspaceId, // We know this is a string here
      projectId,
    };
  }, [boardData, projectId]); // Dependency is now the whole boardData object

//   const handleTaskCreated = (newTask: TaskWithAssignee) => {
//     setBoardData((prev) => {
//       if (!prev) return null;
//       const updatedTasks = [newTask, ...prev.tasks];
//       return { ...prev, tasks: updatedTasks };
//     });
//     toast.success("Task created successfully!");
//   };

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

 

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-foreground">
        Loading List...
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


          <main className="flex-1 overflow-y-auto">
            <ProjectTable
              tasks={boardData.tasks}
              onTaskUpdate={handleTaskUpdate}
            />
          </main>
      </div>
    </ProjectContext.Provider>
  );
}
