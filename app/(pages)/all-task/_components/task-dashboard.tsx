"use client";

import  { mutate } from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button"; // --- NEW: Import Button ---

import {

  PlusCircle,
} from "lucide-react";
import { TaskFormDialog } from "@/components/modals/AddTaskDialog"; // --- NEW: Import the dialog ---
import { TaskFormData } from "@/lib/zod";
import { toast } from "sonner";

// --- Main Page Component ---
export default function MyWorkPage({ userId }: { userId: string }) {

  // --- NEW: State for controlling the dialog visibility ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // --- SWR Hook for the main dashboard data ---


  // --- NEW: The function to handle task creation ---
  const handleCreateTask = async (data: TaskFormData) => {
    console.log("✅ Submitting New Task Data:", data);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // If the response is not OK, handle the structured error
      if (!response.ok) {
        // Parse the JSON error payload from the API
        const errorData = await response.json();

        // Handle Zod validation errors specifically for a better UX
        if (errorData.code === "VALIDATION_ERROR" && errorData.details) {
          // Combine all validation messages into a single string
          const validationMessages = errorData.details
            .map((issue: any) => issue.message)
            .join("\n");
          toast.error(`Validation Failed:\n${validationMessages}`);
        } else {
          // Handle other server errors (e.g., AppError, UNEXPECTED_ERROR)
          toast.error(errorData.message || "An unknown error occurred.");
        }
        return; // Stop execution
      }

      // --- Success Case ---
      toast.success("Task created successfully!");
      console.log("Task created and dashboard data is being refreshed.");
    } catch (error) {
      // This catches network errors or if the server is down
      console.error("Failed to submit form:", error);
      toast.error(
        "Could not connect to the server. Please check your network."
      );
    }
  };

  

  return (
    <div className="">
     
        {/* --- MODIFIED: Header with Add Task Button --- */}
   
        {/* --- Stats Cards --- */}
       <Button
            className="mt-4 sm:mt-0"
            onClick={() => setIsDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
      {/* --- NEW: Render the TaskFormDialog --- */}
      {/* It's better to render it always and control visibility with the 'open' prop */}
      <TaskFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        // Provide the data from our new SWR hook, with fallbacks for the loading state
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
