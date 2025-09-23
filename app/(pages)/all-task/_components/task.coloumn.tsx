"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Task as PrismaTask,
  TaskStatus,
  Priority,
  Project,
  User,
  Department,
} from "@prisma/client";

// This client-safe data type is correctly defined
export type TaskData = Omit<
  PrismaTask,
  | "estimatedHours"
  | "actualHours"
  | "createdAt"
  | "updatedAt"
  | "dueDate"
  | "startDate"
> & {
  estimatedHours: number | null;
  actualHours: number;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  startDate: string | null;
  assignee: User | null;
  reporter: User | null;
  project: Project | null;
  department: Department | null;
};

// Helper function to format text like "To Do" or "In Progress"
const formatStatus = (status: string) => {
  if (!status) return "-";

  const specialCases: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
  };

  if (specialCases[status]) {
    return specialCases[status];
  }

  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const taskColumns: ColumnDef<TaskData>[] = [
 {
  id: "pti-id",
  header: "Task ID",
  cell: ({ row, table }) => {
    const totalRows = table.getRowModel().rows.length;
    const serialNumber = String(totalRows - row.index).padStart(4, "0");
    return <div className="font-medium">PTI-{serialNumber}</div>;
  },
},
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Start Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="pl-4">
        {new Date(row.original.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </div>
    ),
  },
 {
  accessorKey: "title",
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      Task
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => (
    <span className=" capitalize ">
      {row.getValue("title")}
    </span>
  ),
},

  {
    accessorKey: "status",
    header: "Status",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => {
      const status = row.original.status;
      const formatted = formatStatus(status);

      // Decide colors based on status
      let colorClass = "text-gray-500"; // default
      if (status === "TODO") colorClass = "text-red-500"; // Red
      else if (status === "IN_PROGRESS")
        colorClass = "text-amber-500"; // Amber/Yellow
      else if (status === "DONE") colorClass = "text-green-600"; // Green

      return <span className={`font-medium ${colorClass}`}>{formatted}</span>;
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => {
      const priority = row.original.priority;

      let colorClass = "text-gray-500"; // default
      if (priority === "LOW") colorClass = "text-green-600"; // Green
      else if (priority === "MEDIUM") colorClass = "text-amber-500"; // Amber
      else if (priority === "HIGH") colorClass = "text-orange-600"; // Orange
      else if (priority === "URGENT") colorClass = "text-red-600"; // Red

      return (
        <span className={`font-medium capitalize ${colorClass}`}>
          {priority.toLowerCase()}
        </span>
      );
    },
  },
  {
    accessorKey: "assignee.name",
    header: "Assignee",
    cell: ({ row }) => row.original.assignee?.name ?? "Unassigned",
  },
  // ADDED: Reporter column is now included
  {
    accessorKey: "reporter.name",
    header: "Reporter",
    cell: ({ row }) => row.original.reporter?.name ?? "N/A",
  },
  // ADDED: Project column is now included
  {
    accessorKey: "project.name", // Assumes your project model has a 'name' field
    header: "Project",
    cell: ({ row }) => row.original.project?.name ?? "-",
  },

  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Due Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="pl-4">
        {row.original.dueDate
          ? new Date(row.original.dueDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "-"}
      </div>
    ),
  },
];
