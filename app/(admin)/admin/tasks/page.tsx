"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { EditTaskModal } from "./_components/edit-task-model";
import { DataTable } from "../../_components/DataTable";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    // The delete is already handled in the DataTable component
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSaveTask = (updatedTask: any) => {
    setRefreshTrigger(prev => prev + 1);
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  const handleCreateNew = () => {
    // For now, just show a toast. In a real app, this would open a create modal/form
    toast.info("Create new task functionality would be implemented here");
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="container mx-auto p-4 py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
            <p className="text-muted-foreground">
              Manage and track all your tasks in one place
            </p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Stats Cards */}
     

        {/* Data Table */}
        <DataTable
          apiEndpoint="/api/tasks"
          title="All Tasks"
          onEdit={handleEdit}
          onDelete={handleDelete}
          refreshTrigger={refreshTrigger}
        />



        {/* Edit Task Modal */}
        <EditTaskModal
          task={editingTask}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSave={handleSaveTask}
        />
      </div>
    </div>
  );
}