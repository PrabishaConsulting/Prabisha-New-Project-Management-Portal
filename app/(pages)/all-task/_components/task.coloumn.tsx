"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task as PrismaTask, TaskStatus, Priority, Project, User, Department } from "@prisma/client";

// This client-safe data type is correctly defined
export type TaskData = Omit<PrismaTask, 'estimatedHours' | 'actualHours' | 'createdAt' | 'updatedAt' | 'dueDate' | 'startDate'> & {
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
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const taskColumns: ColumnDef<TaskData>[] = [
  {
    id: "pti-id",
    header: "Task ID",
    cell: ({ row }) => {
      const serialNumber = String(row.index + 1).padStart(4, '0');
      return <div className="font-medium">PTI-{serialNumber}</div>;
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => formatStatus(row.original.status),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => formatStatus(row.original.priority),
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
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Start Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Due Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) =>
      row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : "-",
  },
];