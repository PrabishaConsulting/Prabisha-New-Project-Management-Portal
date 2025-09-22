// app/assets/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Asset } from "@prisma/client";
import Link from "next/link";
import { ArrowUpDown, RefreshCw, Pencil } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge"; // Assuming you have this

// Helper to determine expiry info
const getExpiryInfo = (expiryDate: Date | string) => {
  const days = differenceInDays(new Date(expiryDate), new Date());
  let color = "text-foreground";
  if (days <= 7) color = "text-destructive";
  else if (days <= 30) color = "text-yellow-500";
  return { days, color };
};

// Define the type for our table data, including the refresh handler
export type AssetData = Asset & {
  handleRefresh: (id: string) => void;
  checkingId: string | null;
};

export const columns: ColumnDef<AssetData>[] = [
  {
    id: "s_no",
    header: "S. No.",
    cell: ({ row }) => {
      // Tanstack table provides the index of the row
      return <div className="pl-4">{row.index + 1}</div>;
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const asset = row.original;
      // Asset name is now a link that opens in a new tab
      return (
        <Link
          href={asset.name || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {asset.name}
        </Link>
      );
    },
  },
{
  accessorKey: "domainName", // Match this key to the property in your data object
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      Domain link
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => {
    const domainName = row.original.domainName;

    // Return a placeholder if the domain name is not provided
    if (!domainName) {
      return <span className="text-muted-foreground">-</span>;
    }

    // Check if the domain name already starts with a protocol
    const hasProtocol = domainName.startsWith('http://') || domainName.startsWith('https://');

    // Prepend 'https://' only if a protocol is missing
    const fullUrl = hasProtocol ? domainName : `https://${domainName}`;

    return (
      <Link
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary hover:underline"
      >
        {fullUrl}
      </Link>
    );
  },
},
  {
    accessorKey: "assetType",
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "expiryDate",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Expires In
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const { days, color } = getExpiryInfo(row.original.expiryDate);
      return (
        <div className={color}>
          {days > 0 ? `${days} days` : "Expired"}
          <div className="text-xs text-muted-foreground">
            {format(new Date(row.original.expiryDate), "PPP")}
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const asset = row.original;
      const { handleRefresh, checkingId } = asset;

      return (
        <div className="flex items-center justify-end space-x-2">
          {asset.assetType === "DOMAIN" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleRefresh(asset.id)}
              disabled={checkingId === asset.id}
              title="Refresh Live Status"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  checkingId === asset.id ? "animate-spin" : ""
                }`}
              />
            </Button>
          )}
          <Link href={`/assets/edit/${asset.id}`} passHref>
            <Button variant="outline" size="icon" title="Edit Asset">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      );
    },
  },
];