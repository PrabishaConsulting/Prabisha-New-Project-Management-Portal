// app/(pages)/workspaces/clients/client-columns.tsx

"use client";

import { ColumnDef, Row, Table } from "@tanstack/react-table";
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

const getInitials = (name: string | null) => {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

export const clientColumns: ColumnDef<ClientData>[] = [
  {
    accessorKey: "name",
    header: "Client Name",
    cell: ({ row }) => {
      const { name, avatar } = row.original;
      return (
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={avatar ?? undefined} alt={name ?? ''} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{name ?? 'N/A'}</span>
        </div>
      );
    },
  },
  { accessorKey: "industry", header: "Industry", cell: ({ row }) => row.original.industry ?? 'N/A' },
    { accessorKey: "location", header: "Location", cell: ({ row }) => row.original.location ?? 'N/A' },
  { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? 'N/A' },

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
      const meta = table.options.meta as { openEditModal: (record: ClientData) => void };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => meta.openEditModal(record)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];