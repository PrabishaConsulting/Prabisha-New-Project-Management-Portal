// app/clients/client-columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// This type defines the shape of our client data, ensuring it's safe for the client.
// It uses fields from your `User` schema.
export type ClientData = Pick<User, "id" | "name" | "email" | "avatar"> & {
  createdAt: Date; // Dates are passed as strings
};

// Helper to get initials from a name for the avatar fallback
const getInitials = (name: string) => {
  const names = name.split(" ");
  const initials = names.map((n) => n[0]).join("");
  return initials.toUpperCase();
};

export const clientColumns: ColumnDef<ClientData>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Client Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const client = row.original;
      return (
        <div className="flex items-center space-x-3 pl-4">
          <Avatar>
            <AvatarImage src={client.avatar ?? undefined} alt={client.name} />
            <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{client.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div>{row.getValue("email")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date Joined
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="pl-4">
        {new Date(row.original.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
    ),
  },
];