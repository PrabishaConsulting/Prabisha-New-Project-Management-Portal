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
import { useTaskTimer } from "@/hooks/useTaskTimer";
import { toast } from "sonner";

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
  const [pendingStatus, setPendingStatus] = useState<PrismaTask["status"] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { 
    startTimer, 
    stopTimer, 
    hasActiveTimer, 
    getTimerForTask,
    pauseTimer,
    resumeTimer 
  } = useTaskTimer();
  
  const statuses: PrismaTask["status"][] = [
    "TO_DO",
    "IN_PROGRESS",
    "REVIEW",
    "DONE",
  ];
  const currentStatusDetails = getStatusDetails(task.status);

  const handleStatusChange = (newStatus: PrismaTask["status"]) => {
    if (newStatus === task.status) return;
    
    // If status is being changed to DONE, open comment dialog
    if (newStatus === "DONE") {
      setPendingStatus(newStatus);
      setIsCommentDialogOpen(true);
      setIsOpen(false);
      return;
    }
    
    // For other statuses, update immediately
    updateTaskStatus(newStatus);
  };

  const updateTaskStatus = async (newStatus: PrismaTask["status"], commentText?: string) => {
    const oldStatus = task.status;
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          comment: commentText || ""
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      
      // Handle timer based on status change
      switch (newStatus) {
        case "IN_PROGRESS":
          if (oldStatus !== "IN_PROGRESS") {
            if (hasActiveTimer(task.id)) {
              const timer = getTimerForTask(task.id);
              if (timer?.isPaused) {
                resumeTimer(task.id);
                toast.success("Status updated & Timer resumed", {
                  description: `Resumed tracking: ${task.title}`,
                });
              } else {
                toast.success("Status updated to In Progress");
              }
            } else {
              startTimer(task.id, task.title);
              toast.success("Status updated & Timer started", {
                description: `Now tracking: ${task.title}`,
              });
            }
          } else {
            toast.success("Status updated to In Progress");
          }
          break;
          
        case "REVIEW":
          if (oldStatus === "IN_PROGRESS") {
            if (hasActiveTimer(task.id)) {
              pauseTimer(task.id);
              toast.success("Status updated & Timer paused", {
                description: `Timer paused for: ${task.title}`,
              });
            } else {
              toast.success("Status updated to In Review");
            }
          } else {
            toast.success("Status updated to In Review");
          }
          break;
          
        case "DONE":
          if (hasActiveTimer(task.id)) {
            const elapsed = await stopTimer(task.id);
            const minutes = Math.round(elapsed / 60);
            toast.success("Status updated & Timer stopped", {
              description: `Logged ${minutes} minute${minutes !== 1 ? 's' : ''} to task`,
            });
          } else {
            toast.success("Status updated to Completed");
          }
          break;
          
        case "TO_DO":
          if (hasActiveTimer(task.id)) {
            const elapsed = await stopTimer(task.id);
            const minutes = Math.round(elapsed / 60);
            toast.info("Timer stopped", {
              description: `Logged ${minutes} minute${minutes !== 1 ? 's' : ''}`,
            });
          }
          toast.success("Status updated to To Do");
          break;
      }
      
      onUpdate();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update status", {
        description: "Please try again",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCommentSubmit = () => {
    if (pendingStatus) {
      updateTaskStatus(pendingStatus, comment);
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
      <DropdownMenu open={isOpen} onOpenChange={(open) => {
        if (!isUpdating) setIsOpen(open);
      }}>
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
                        {isActive && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
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
      <Dialog open={isCommentDialogOpen} onOpenChange={(open) => {
        if (!isUpdating) setIsCommentDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Task Completion</DialogTitle>
            <DialogDescription className="text-base">
              Add a comment about the completion of this task. This helps maintain project records and team communication.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="comment" className="text-sm font-medium mb-2 block">
              Completion Comment *
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="Describe what was accomplished, any challenges faced, or next steps..."
              disabled={isUpdating}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              {comment.length} characters
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCommentCancel} 
              disabled={isUpdating}
            >
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
                "Complete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StatusSelector;