// app/our-product/_components/columns.tsx

"use client";

import { products } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const columns: ColumnDef<products>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "serial_number",
    header: "S.No.",
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination;
      const serialNumber = pageIndex * pageSize + row.index + 1;
      return <span>{serialNumber}</span>;
    },
    enableSorting: false,
  },
  { accessorKey: "title", header: "Title" },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => (
      <a href={row.original.url || "NA"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {row.original.url}
      </a>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date Added",
    cell: ({ row }) => format(new Date(row.original.createdAt), "PPP"),
  },
  {
    id: "actions",
    cell: ({ row, table }) => <CellAction data={row.original} tableMeta={table.options.meta} />,
  },
];