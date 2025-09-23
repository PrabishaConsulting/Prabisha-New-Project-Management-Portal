"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Task, ProjectMember, User } from "@prisma/client";
import { SortableTaskCard } from "./sortable-task-card";
import { NewTaskDialog } from "../modals/new-task-dialog";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { type Department } from "@prisma/client";


type TaskWithAssignee = Task & {
  assignee: { id: string; name: string | null; avatar: string | null } | null;
};
type MemberWithUser = ProjectMember & { user: User };

interface KanbanColumnProps {
  column: {
    title: string;
    status: Task["status"];
  };
  tasks: TaskWithAssignee[];
  projectId: string;
  currentUserId: string;
  members: MemberWithUser[];
  onTaskCreated: (newTask: any) => void;
  departments: Department[];
}

export function KanbanColumn({
  column,
  tasks,
  projectId,
  currentUserId,
  members,
  onTaskCreated,
  departments,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    data: { type: "Column", status: column.status },
  });

  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  return (
    <div className="flex flex-col h-full md:w-full">
      <div className="flex items-center gap-2 mb-3 px-2 flex-shrink-0">
        <h2 className="font-semibold text-foreground">{column.title}</h2>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="p-2 border-t border-border/50 flex-shrink-0">
        <NewTaskDialog
          projectId={projectId}
          status={column.status}
          reporterId={currentUserId}
          members={members}
          onTaskCreated={onTaskCreated}
          departments={departments}
        >
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add a Task
          </Button>
        </NewTaskDialog>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "bg-muted/30 rounded-lg flex flex-col flex-grow transition-colors",
          isOver ? "bg-accent" : ""
        )}
      >
        <div className="flex-1 p-2 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
          <SortableContext
            items={taskIds}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} />
            ))}
          </SortableContext>

          {tasks.length === 0 && !isOver && (
            <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Drop tasks here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
