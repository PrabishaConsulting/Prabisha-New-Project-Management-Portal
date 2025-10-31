"use client";

import { useState, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Circle,
  CircleDotDashed,
  ShieldCheck,
  Milestone,
  Loader2,
} from "lucide-react";
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
import { toast } from "sonner";
import { useTaskTimer } from "@/hooks/useTaskTimer";

type PrismaTask = {
  id: string;
  title: string;
  status: "TO_DO" | "IN_PROGRESS" | "REVIEW" | "DONE";
};

const getStatusDetails = (status: PrismaTask["status"]) => {
  switch (status) {
    case "IN_PROGRESS":
      return {
        text: "In Progress",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
        icon: <CircleDotDashed className="h-4 w-4 text-blue-500" />,
      };
    case "DONE":
      return {
        text: "Completed",
        className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20",
        icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
      };
    case "TO_DO":
      return {
        text: "To Do",
        className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20",
        icon: <Circle className="h-4 w-4 text-yellow-500" />,
      };
    case "REVIEW":
      return {
        text: "In Review",
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
        icon: <Milestone className="h-4 w-4 text-purple-500" />,
      };
    default:
      return {
        text: status,
        className: "bg-muted text-muted-foreground",
        icon: <Circle className="h-4 w-4 text-muted-foreground" />,
      };
  }
};

type StatusSelectorProps = {
  task: PrismaTask;
  onUpdate: () => void;
};

const StatusSelector = ({ task, onUpdate }: StatusSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [actualTime, setActualTime] = useState<number>(0);
  const [pendingStatus, setPendingStatus] = useState<PrismaTask["status"] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { getTimerForTask } = useTaskTimer();

  const statuses: PrismaTask["status"][] = ["TO_DO", "IN_PROGRESS", "REVIEW", "DONE"];
  const currentStatusDetails = getStatusDetails(task.status);

  const handleStatusChange = (newStatus: PrismaTask["status"]) => {
    if (newStatus === task.status) return;

    // Get elapsed time from localStorage (if timer exists)
    const timer = getTimerForTask(task.id);
    const elapsedMinutes = timer ? Math.round(timer.totalElapsed / 60) : 0;

    setActualTime(elapsedMinutes);
    setPendingStatus(newStatus);
    setIsCommentDialogOpen(true);
    setIsOpen(false);
  };

  const updateTaskStatus = async (
    newStatus: PrismaTask["status"],
    commentText?: string,
    timeSpent?: number
  ) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          comment: commentText || "",
          actualTime: timeSpent || 0,
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Toast messages based on status
      if (newStatus === "IN_PROGRESS") {
        toast.info("Task moved to In Progress", {
          description: "Start the timer manually when you begin working.",
        });
      } else if (newStatus === "DONE") {
        toast.success("Task marked as Completed", {
          description: `Logged ${timeSpent || 0} minute${timeSpent !== 1 ? "s" : ""}`,
        });
      } else {
        toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      }

      onUpdate();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCommentSubmit = () => {
    if (pendingStatus) {
      updateTaskStatus(pendingStatus, comment, pendingStatus === "DONE" ? actualTime : undefined);
      setIsCommentDialogOpen(false);
      setComment("");
      setPendingStatus(null);
    }
  };

  const handleCommentCancel = () => {
    setIsCommentDialogOpen(false);
    setComment("");
    setPendingStatus(null);
  };

  return (
    <>
      {/* Status Dropdown */}
      <DropdownMenu
        open={isOpen}
        onOpenChange={(open) => {
          if (!isUpdating) setIsOpen(open);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Badge
            className={`${currentStatusDetails.className} cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 px-3 py-1 border`}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs font-medium">Updating...</span>
              </>
            ) : (
              <>
                {currentStatusDetails.icon}
                <span className="text-xs font-medium">{currentStatusDetails.text}</span>
              </>
            )}
          </Badge>
        </DropdownMenuTrigger>

        <AnimatePresence>
          {isOpen && (
            <DropdownMenuContent asChild forceMount align="start" className="w-48">
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
              >
                {statuses.map((status, index) => {
                  const details = getStatusDetails(status);
                  const isActive = task.status === status;

                  return (
                    <Fragment key={status}>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(status)}
                        className="flex items-center gap-2 cursor-pointer"
                        disabled={isUpdating}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          {details.icon}
                          <span className="text-sm">{details.text}</span>
                        </div>
                        {isActive && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>

                      {index < statuses.length - 1 && <DropdownMenuSeparator />}
                    </Fragment>
                  );
                })}
              </motion.div>
            </DropdownMenuContent>
          )}
        </AnimatePresence>
      </DropdownMenu>

      {/* Comment Dialog */}
      <Dialog
        open={isCommentDialogOpen}
        onOpenChange={(open) => {
          if (!isUpdating) setIsCommentDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Update Task Status</DialogTitle>
            <DialogDescription className="text-base">
              Add a comment about this status change to keep the team informed.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="comment" className="text-sm font-medium mb-2 block">
              Comment *
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="Describe the change, progress, or completion details..."
              disabled={isUpdating}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              {comment.length} characters
            </p>
          </div>

          {/* Actual Time field only if status = DONE */}
          {pendingStatus === "DONE" && (
            <div className="mt-4">
              <Label htmlFor="actualTime" className="text-sm font-medium mb-2 block">
                Actual Time (minutes)
              </Label>
              <input
                type="number"
                id="actualTime"
                value={actualTime}
                onChange={(e) => setActualTime(Number(e.target.value))}
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
                min={0}
                disabled={isUpdating}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Elapsed from timer:{" "}
                {Math.round((getTimerForTask(task.id)?.totalElapsed || 0) / 60)} min
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={handleCommentCancel} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={!comment.trim() || isUpdating}
              className="min-w-[100px]"
            >
              {isUpdating ? (
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
    </>
  );
};

export default StatusSelector;
