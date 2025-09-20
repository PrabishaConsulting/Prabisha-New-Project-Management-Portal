// FILE: ./components/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Delete,
  User2Icon as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- INTERFACES & TYPES ---
interface UserInfo {
  id: string;

  name: string | null;
  avatar: string | null;
}
type ProjectMember = {
  user: UserInfo;
};
interface Project {
  id: string;
  name: string;
  startDate: string | number | Date;
  dueDate: string | number | Date;
  status: string;
  lead: UserInfo;
  department?: { id: string; name: string };
  client?: { id: string; name: string };
  internalProduct?: { id: string; name: string };
  members: ProjectMember[];
  _count: {
    tasks: number;
  };
}

// --- COLUMN DEFINITIONS ---
export const columns = (
  workspaceId: string,
  onDeleteClick: (project: Project) => void
): ColumnDef<Project>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "Project ID",
   cell: ({ row, table }) => {
    const totalRows = table.getRowModel().rows.length;
    const serialNumber = String(totalRows - row.index).padStart(4, "0");
    return <div className="font-medium">PCP-{serialNumber}</div>;
  },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => (
      <Button
        className=""
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Start Date
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("startDate"));
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short", // This is the key change
        day: "numeric",
      };

      return (
        <div className="text-center">
          {date.toLocaleDateString(undefined, options)}
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      // Constrains width and truncates long project names
      <div className="max-w-[250px] truncate font-medium capitalize">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorFn: (row) => row._count.tasks,
    id: "tasks",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Tasks <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.original._count.tasks}</div>
    ),
  },
  {
    accessorFn: (row) => row.client?.name || row.internalProduct?.name || "N/A",
    id: "clientName",
    header: "Client / Product",
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => <div>{row.original.department?.name || "N/A"}</div>,
  },
  {
    accessorKey: "lead",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Lead <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const lead = row.original.lead;
      const initials = lead?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      return (
        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6 ">
            <AvatarImage
              className="object-cover"
              src={lead.avatar || undefined}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{lead.name}</span>
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const nameA = rowA.original.lead.name || "";
      const nameB = rowB.original.lead.name || "";
      return nameA.localeCompare(nameB);
    },
  },

  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Due Date
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("startDate"));
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short", // This is the key change
        day: "numeric",
      };

      return (
        <div className="text-center">
          {date.toLocaleDateString(undefined, options)}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "ACTIVE" ? "success" : "secondary"}>
          {status}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const project = row.original;
      const router = useRouter();
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => router.push(`/projects/${project.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteClick(project)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Delete className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
