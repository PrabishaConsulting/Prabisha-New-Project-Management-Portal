// app/tasks/_components/task-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Task } from "@prisma/client";

export const taskColumns: ColumnDef<
  Task & {
    assignee?: { name: string | null };
    reporter: { name: string | null };
    project: { title: string };
    department?: { name: string };
  }
>[] = [
  {
    accessorKey: "title",
    header: "Title",
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    enableSorting: true,
    cell: ({ row }) => {
      const status = row.original.status;
      return status
        ? status.toLowerCase().charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        : "-";
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    enableSorting: true,
  },
  {
    accessorKey: "assignee.name",
    header: "Assignee",
    enableSorting: true,
    cell: ({ row }) => row.original.assignee?.name ?? "Unassigned",
  },
  {
    accessorKey: "reporter.name",
    header: "Reporter",
    enableSorting: true,
  },
  {
    accessorKey: "project.title",
    header: "Project",
    enableSorting: true,
    cell: ({ row }) => row.original.project?.title ?? "-",
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    enableSorting: true,
    cell: ({ row }) =>
      row.original.dueDate
        ? new Date(row.original.dueDate).toLocaleDateString()
        : "-",
  },
];
