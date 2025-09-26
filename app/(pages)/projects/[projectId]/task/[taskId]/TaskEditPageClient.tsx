"use client";

import { useState } from "react";
import {
  type Task,
  type TaskComment,
  type TimeEntry,
  type User,
  type ProjectMember,
  TaskStatus,
  Priority,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Trash2, X, Copy } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TimeTracking } from "./time-tracking";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// A type for project members that includes the nested user object
type MemberWithUser = ProjectMember & {
  user: { id: string; name: string | null; avatar: string | null };
};

// A client-safe version of TimeEntryWithUser where the date is a string
type ClientTimeEntry = Omit<TimeEntry, "date" | "createdAt" | "updatedAt"> & {
  date: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; avatar: string | null };
};

// A client-safe version of TaskComment where the date is a string
type ClientComment = Omit<TaskComment, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; avatar: string | null };
};

// The single, definitive, client-safe type for our task object.
// All `Decimal` fields are `number` and all `DateTime` fields are `string`.
type ClientTask = Omit<
  Task,
  | "actualHours"
  | "estimatedHours"
  | "createdAt"
  | "updatedAt"
  | "dueDate"
  | "startDate"
> & {
  actualHours: number;
  estimatedHours: number | null;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  startDate: string | null;
  assignee: { id: string; name: string | null; avatar: string | null } | null;
  reporter: { id: string; name: string | null; avatar: string | null };
  comments: ClientComment[];
  timeEntries: ClientTimeEntry[];
};

interface TaskEditPageClientProps {
  initialTask: ClientTask;
  projectMembers: MemberWithUser[]; // This now uses the correct type
  currentUserId: string;
}

export function TaskEditPageClient({
  initialTask,
  projectMembers, // This now uses the correct type
  currentUserId,
}: TaskEditPageClientProps) {
  const router = useRouter();
  // State initialization is now simple, as the data is already in the correct format.
  const [task, setTask] = useState<ClientTask>(initialTask);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

  const handleTaskUpdate = async (updates: Partial<ClientTask>) => {
    const previousTask = { ...task };
    setTask((prev) => ({ ...prev, ...updates }));

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to save update.");

      // The server API will return a non-serialized object, so we must re-serialize it for our state.
      const updatedTaskFromServer = await response.json();
      setTask((prev) => ({
        ...prev,
        ...updatedTaskFromServer,
        actualHours: Number(updatedTaskFromServer.actualHours),
        estimatedHours: updatedTaskFromServer.estimatedHours
          ? Number(updatedTaskFromServer.estimatedHours)
          : null,
        dueDate: updatedTaskFromServer.dueDate
          ? new Date(updatedTaskFromServer.dueDate).toISOString()
          : null,
      }));
      toast.success("Task updated successfully.");
    } catch (error) {
      toast.error("Update Failed", { description: (error as Error).message });
      setTask(previousTask);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      if (!response.ok) throw new Error("Failed to post comment.");
      const newComment: ClientComment = await response.json();
      setTask((prev) => ({
        ...prev,
        comments: [newComment, ...prev.comments],
      }));
      setComment("");
    } catch (error) {
      toast.error("Comment Failed", { description: (error as Error).message });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleTimeLogged = (
    newEntry: ClientTimeEntry,
    newTotalHours: number
  ) => {
    setTask((prev) => ({
      ...prev,
      actualHours: newTotalHours,
      timeEntries: [newEntry, ...prev.timeEntries],
    }));
  };

  const statusOrder = [
    TaskStatus.TO_DO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.REVIEW,
    TaskStatus.DONE,
  ];
  const priorityOrder = [
    Priority.URGENT,
    Priority.HIGH,
    Priority.MEDIUM,
    Priority.LOW,
  ];

const handleDeleteTask = async (taskId: string) => {
  setIsDeletingTask(true);
  try {
    const response = await fetch(`/api/tasks/${taskId}/delete-task`, {
      method: "DELETE",
    });

    if (!response.ok) {
      // Try to parse error response
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If parsing fails, use status text
        throw new Error(response.statusText || "Failed to delete task.");
      }

      // Handle specific 403 error - FIXED: Check for errorData.error instead of message
      if (response.status === 403) {
        if (errorData.error === "Forbidden: You are not a member") {
          throw new Error("You don't have permission to delete this task. Only team members can delete tasks.");
        }
        throw new Error("Permission denied. You cannot delete this task.");
      }

      // Handle other error cases - FIXED: Check for error property first
      throw new Error(errorData.error || errorData.message || "Failed to delete task.");
    }

    // Success case
    toast.success("Task deleted successfully.");
    router.push(`/all-task`);
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    // Show specific toast for permission errors
    if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
      toast.error("Permission Denied", {
        description: errorMessage, // Use the actual error message
        action: {
          label: "Contact Admin",
          onClick: () => router.push("/support"),
        }
      });
    } else {
      toast.error("Deletion Failed", { description: errorMessage });
    }
  } finally {
    setIsDeletingTask(false);
  }
};

  const formatStatus = (status: string) => {
    if (!status) return "";

    return status
      .toLowerCase() // 1. -> "to_do"
      .split("_") // 2. -> ["to", "do"]
      .map(
        (
          word // 3. -> ["To", "Do"]
        ) => word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" "); // 4. -> "To Do"
  };

  const handleTaskClick = (task: any) => {
    // Add your logic here - e.g., open task details, navigate, etc.
    navigator.clipboard.writeText(task.title);
    toast.success("Task name copied to clipboard");
    console.log("Task clicked:", task);
    // Example: router.push(`/tasks/${task.id}`);
  };

  return (
    <div className="flex h-full p-4 md:p-6 text-foreground bg-background">
      {/* Left Column: Main Content */}
      <div className="flex-1 pr-8 space-y-8">
        <Input
          defaultValue={task.title}
          onBlur={(e) => handleTaskUpdate({ title: e.target.value })}
          className="text-2xl font-bold h-12 bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-primary px-2"
        />
        <Textarea
          defaultValue={task.description || ""}
          placeholder="Add a description..."
          onBlur={(e) => handleTaskUpdate({ description: e.target.value })}
          className="min-h-[200px] bg-muted/30 border-border"
        />
        <TimeTracking
          taskId={task.id}
          initialTotalHours={task.actualHours}
          timeEntries={task.timeEntries}
          onTimeLog={handleTimeLogged}
        />
        <div>
          <h3 className="text-lg font-semibold mb-2">Comments & Activity</h3>
          <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-muted/30 border-border"
            />
            <Button type="submit" disabled={isSubmittingComment}>
              Post
            </Button>
          </form>
          <div className="space-y-4">
            {task.comments.map((c) => (
              <div key={c.id} className="flex gap-3 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    className="object-cover"
                    src={c.user.avatar || ""}
                  />
                  <AvatarFallback>{c.user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p>
                    <span className="font-semibold">{c.user.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {format(new Date(c.createdAt), "d MMM yyyy")}
                    </span>
                  </p>
                  <p className="text-muted-foreground">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right Column: Sidebar */}
      <div className="w-72 border-l border-border pl-8 space-y-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <Select
            value={task.status}
            onValueChange={(val) =>
              handleTaskUpdate({ status: val as TaskStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOrder.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Assign to
          </label>
          <Select
            value={task.assigneeId || "unassigned"}
            onValueChange={(val) =>
              handleTaskUpdate({
                assigneeId: val === "unassigned" ? null : val,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {/* FIX: Map over projectMembers correctly */}
              {projectMembers.map((member) => (
                <SelectItem key={member.id} value={member.user.id}>
                  {member.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Priority
          </label>
          <Select
            value={task.priority}
            onValueChange={(val) =>
              handleTaskUpdate({ priority: val as Priority })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOrder.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Due Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !task.dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {task.dueDate ? (
                  format(new Date(task.dueDate), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                onSelect={(date) =>
                  handleTaskUpdate({
                    dueDate: date ? date.toISOString() : null,
                  })
                }
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            disabled={isDeletingTask}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Task
          </Button>
        </div>
      </div>
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-gray-700/20 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Delete Task</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteConfirmationInput("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the
              task and all associated data.
            </p>

            <div className="space-y-2">
              <Label className="text-sm font-medium block">
                To confirm, type{"  "}
                <button
                  type="button"
                  onClick={() => handleTaskClick(task)} // Add your click handler
                  className="inline-flex items-center p-0 m-0 bg-transparent border-none cursor-pointer"
                >
                  <Badge variant="outline" className="font-mono font-bold">
                    {task.title}
                  </Badge>
                </button>
                {"  "} below:
              </Label>
              <div className="flex gap-2">
                <Input
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="Type task name here"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeleteConfirmationInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={
                  deleteConfirmationInput !== task.title || isDeletingTask
                }
                onClick={() => handleDeleteTask(task.id)}
              >
                {isDeletingTask ? "Deleting..." : "Delete Task"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
