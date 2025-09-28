// app/(pages)/workspaces/clients/_components/client-columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generatePcId } from "@/utils/task-utils";

export type ClientData = {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  location: string | null;
  industry: string | null;
  createdAt: Date;
  __type: 'CLIENT' | 'INTERNAL_PRODUCT';
};


export const clientColumns: ColumnDef<ClientData>[] = [
  {
    id: 'serialNumber',
    header: "ID",
    cell: ({ row }) => {
          const clientId = row.original.id; // Assuming the task UUID is in row.original.id
    const ptiId = generatePcId(clientId);
      return <span>{ptiId}</span>;
    },
  },
  {
    accessorKey: "name",
    header: "Client Name",
    cell: ({ row }) => {
      const { name } = row.original;
      return (
        <div className="flex items-center space-x-3">
        
          <span className="font-medium">{name ?? 'N/A'}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "industry",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Industry <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="pl-4">{row.original.industry ?? 'N/A'}</div>,
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Location <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="pl-4">{row.original.location ?? 'N/A'}</div>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Email <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="pl-4">{row.original.email ?? 'N/A'}</div>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Date Joined <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("en-GB"),
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const record = row.original;
      const meta = table.options.meta as {
        openEditModal: (record: ClientData) => void;
        openDeleteModal: (record: ClientData) => void;
      };
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => meta.openEditModal(record)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => meta.openDeleteModal(record)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];