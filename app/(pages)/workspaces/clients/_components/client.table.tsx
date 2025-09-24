// app/(pages)/workspaces/clients/client-table.tsx

"use client";

import { useState } from "react";
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState, // Import ColumnFiltersState
} from "@tanstack/react-table";
import { ClientData, clientColumns } from "./client.coloumn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditRecordModal } from "@/components/modals/EditRecordModal";
import { Input } from "@/components/ui/input";

interface ClientTableProps {
  data: ClientData[];
  onDataChange: () => void;
}

export default function ClientTable({ data, onDataChange }: ClientTableProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ClientData | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  
  // --- NEW: State for column-specific filters ---
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns: clientColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters, // Add columnFilters to state
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters, // Add the handler
    onGlobalFilterChange: setGlobalFilter,
    meta: {
      openEditModal: (record: ClientData) => {
        setSelectedRecord(record);
        setIsEditModalOpen(true);
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* --- UPDATED: Filter Section --- */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by location..."
          // Get the current filter value for the 'location' column
          value={(table.getColumn("location")?.getFilterValue() as string) ?? ""}
          // Set the filter value for the 'location' column
          onChange={(e) =>
            table.getColumn("location")?.setFilterValue(e.target.value)
          }
          className="max-w-xs"
        />
        <Input
          placeholder="Filter by industry..."
          // Get the current filter value for the 'industry' column
          value={(table.getColumn("industry")?.getFilterValue() as string) ?? ""}
          // Set the filter value for the 'industry' column
          onChange={(e) =>
            table.getColumn("industry")?.setFilterValue(e.target.value)
          }
          className="max-w-xs"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={clientColumns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <EditRecordModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        record={selectedRecord}
        onRecordUpdated={onDataChange}
      />
    </div>
  );
}