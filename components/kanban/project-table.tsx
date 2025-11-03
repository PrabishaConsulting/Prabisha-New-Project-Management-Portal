"use client";

import { Task, TaskStatus, Priority } from "@/app/generated/client";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useProject } from "@/context/project-context";
import StatusSelector from "@/app/(pages)/projects/user-work/[userId]/_components/StatusSelector";

type TaskWithAssignee = Task & {
  assignee: { id: string; name: string | null; avatar: string | null } | null;
};
interface ProjectTableProps {
  tasks: TaskWithAssignee[];
  onTaskUpdate: () => void;
  pagination: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalTasks: number;
  };
  onNext: () => void;
  onPrev: () => void;
}

const statusOrder = [
  TaskStatus.TO_DO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DONE,
];
const priorityStyles: Record<Priority, string> = {
  URGENT: "bg-red-600",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-sky-500",
};

export function ProjectTable({
  tasks,
  onTaskUpdate,
  pagination,
  onNext,
  onPrev,
}: ProjectTableProps) {
  const { workspaceId } = useProject();
  const router = useRouter();
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusComparison =
      statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusComparison !== 0) return statusComparison;
    return a.position - b.position;
  });

  const handleEdit = async (projectId: string, taskId: string) => {
    const toastId = toast.loading("Loading task editor...");

    try {
      // Small delay for UX polish (optional)
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push(
        `/projects/${projectId}/task/${taskId}?workspaceId=${workspaceId}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to open task editor.");
    } finally {
      // Dismiss the loading toast after a short delay to ensure route transition started
      setTimeout(() => toast.dismiss(toastId), 1000);
    }
  };
  const handleView = async (projectId: string, taskId: string) => {
    const toastId = toast.loading("Loading task Details...");

    try {
      // Small delay for UX polish (optional)
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push(
        `/projects/${projectId}/task/${taskId}?workspaceId=${workspaceId}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to open task editor.");
    } finally {
      // Dismiss the loading toast after a short delay to ensure route transition started
      setTimeout(() => toast.dismiss(toastId), 1000);
    }
  };

  return (
    <div className="border rounded-lg bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/50">
            <TableHead className="w-[25%] font-semibold text-foreground">
              Task
            </TableHead>
            <TableHead className="w-[15%] font-semibold text-foreground">
              Status
            </TableHead>
            <TableHead className="w-[10%] font-semibold text-foreground">
              Priority
            </TableHead>
            <TableHead className="w-[20%] font-semibold text-foreground">
              Assignee
            </TableHead>
            <TableHead className="w-[15%] font-semibold text-foreground">
              Due Date
            </TableHead>
            <TableHead className="text-right w-[15%] font-semibold text-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedTasks.length > 0 ? (
            sortedTasks.map((task) => (
              <TableRow
                key={task.id}
                className="border-border hover:bg-muted/70 transition-colors"
              >
                {/* ✅ Task Title (Truncated) */}
                <TableCell className="font-medium text-foreground capitalize overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]">
                  <span title={task.title}>{task.title}</span>
                </TableCell>

                {/* ✅ Status Selector */}
                <TableCell>
                  <StatusSelector task={task} onUpdate={onTaskUpdate} />
                </TableCell>

                {/* ✅ Priority Badge */}
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn("text-white", priorityStyles[task.priority])}
                  >
                    {task.priority}
                  </Badge>
                </TableCell>

                {/* ✅ Assignee */}
                <TableCell>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={task.assignee.avatar || ""}
                          alt={task.assignee.name || ""}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {task.assignee.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className="text-muted-foreground truncate max-w-[120px]"
                        title={task.assignee.name || ""}
                      >
                        {task.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>

                {/* ✅ Due Date */}
                <TableCell className="text-muted-foreground">
                  {task.dueDate ? format(new Date(task.dueDate), "PP") : "–"}
                </TableCell>

                {/* ✅ Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleView(task.projectId, task.id)}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEdit(task.projectId, task.id)}
                      >
                        Edit Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No tasks found for this project.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between p-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages} (
          {pagination.totalTasks} tasks)
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!pagination.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
