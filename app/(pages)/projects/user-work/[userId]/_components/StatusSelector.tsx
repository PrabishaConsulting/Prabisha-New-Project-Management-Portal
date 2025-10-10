// components/StatusSelector.tsx

"use client"; // Required for useState and event handlers

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

// Your Prisma task type
type PrismaTask = {
  id: string;
  status: "TO_DO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  // ... other task properties
};

// Helper to get all details for a status (text, colors, and icon)
const getStatusDetails = (status: PrismaTask["status"]) => {
  switch (status) {
    case "IN_PROGRESS":
      return {
        text: "In Progress",
        className:
          "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
        icon: <CircleDotDashed className="h-4 w-4 text-blue-500" />,
      };
    case "DONE":
      return {
        text: "Completed",
        className:
          "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20",
        icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
      };
    case "TO_DO":
      return {
        text: "To Do",
        className:
          "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
        icon: <Circle className="h-4 w-4 text-yellow-500" />,
      };
    case "REVIEW":
      return {
        text: "In Review",
        className:
          "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
        icon: <Milestone className="h-4 w-4 text-purple-500" />,
      };
    default:
      return {
        text: status,
        className: "bg-gray-500",
        icon: <Circle className="h-4 w-4 text-gray-500" />,
      };
  }
};

type StatusSelectorProps = {
  task: PrismaTask;
  onUpdate: () => void; // Function to refresh data in the parent component
};

const StatusSelector = ({ task, onUpdate }: StatusSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingStatus, setPendingStatus] = useState<PrismaTask["status"] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false); // New state for loading
  
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
      setIsOpen(false); // Close the dropdown
      return;
    }
    
    // For other statuses, update immediately
    updateTaskStatus(newStatus);
  };

  const updateTaskStatus = async (newStatus: PrismaTask["status"], commentText?: string) => {
    setIsUpdating(true); // Start loading state
    
    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          comment: commentText || "" // Include comment if provided
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      onUpdate();
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false); // End loading state
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
        // Prevent opening dropdown while updating
        if (!isUpdating) setIsOpen(open);
      }}>
        <DropdownMenuTrigger asChild>
          <Badge
            className={`${currentStatusDetails.className} cursor-pointer transition-transform duration-200 hover:scale-105 flex items-center gap-1`}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              currentStatusDetails.text
            )}
          </Badge>
        </DropdownMenuTrigger>

        <AnimatePresence>
          {isOpen && (
            <DropdownMenuContent asChild forceMount align="start">
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
              >
                {statuses.map((status, index) => {
                  const details = getStatusDetails(status);
                  return (
                    <Fragment key={status}>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(status)}
                        className="flex items-center gap-2"
                        disabled={isUpdating} // Disable menu items while updating
                      >
                        {details.icon}
                        <span>{details.text}</span>
                        {task.status === status && (
                          <Check className="ml-auto h-4 w-4" />
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
        // Prevent closing dialog while updating
        if (!isUpdating) setIsCommentDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Completion Comment</DialogTitle>
            <DialogDescription>
              Please add a comment about why this task is being marked as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="comment" className="text-right">
                Comment
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="col-span-3"
                placeholder="Enter your comment here..."
                rows={3}
                disabled={isUpdating} // Disable textarea while updating
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCommentCancel} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleCommentSubmit} disabled={!comment.trim() || isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StatusSelector;