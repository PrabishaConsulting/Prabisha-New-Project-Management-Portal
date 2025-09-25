// components/StatusSelector.tsx

"use client"; // Required for useState and event handlers

import { useState , Fragment } from "react";
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
} from "lucide-react";

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
  const statuses: PrismaTask["status"][] = [
    "TO_DO",
    "IN_PROGRESS",
    "REVIEW",
    "DONE",
  ];
  const currentStatusDetails = getStatusDetails(task.status);

  const handleStatusChange = async (newStatus: PrismaTask["status"]) => {
    if (newStatus === task.status) return;

    try {
      // 🚨 REPLACE WITH YOUR API ENDPOINT
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");
      onUpdate();
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Badge
          className={`${currentStatusDetails.className} cursor-pointer transition-transform duration-200 hover:scale-105`}
        >
          {currentStatusDetails.text}
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
              {statuses.map((status  , index) => {
                const details = getStatusDetails(status);
                return (
                  // 2. Use a Fragment to group the item and the potential separator
                  <Fragment key={status}>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(status)}
                      className="flex items-center gap-2"
                    >
                      {details.icon}
                      <span>{details.text}</span>
                      {task.status === status && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </DropdownMenuItem>

                    {/* 3. Conditionally render the separator */}
                    {index < statuses.length - 1 && <DropdownMenuSeparator />}
                  </Fragment>
                );
              })}
            </motion.div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
};

export default StatusSelector;
