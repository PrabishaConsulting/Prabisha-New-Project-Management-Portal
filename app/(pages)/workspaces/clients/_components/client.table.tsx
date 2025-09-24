// app/(pages)/workspaces/clients/client-table.tsx

"use client";

import { useState } from "react";
import { ColumnDef, useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { ClientData, clientColumns } from "./client.coloumn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditRecordModal } from "@/components/modals/EditRecordModal"; // Adjust path as needed

interface ClientTableProps {
  data: ClientData[];
  onDataChange: () => void;
}

export default function ClientTable({ data, onDataChange }: ClientTableProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ClientData | null>(null);

  const table = useReactTable({
    data,
    columns: clientColumns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      openEditModal: (record: ClientData) => {
        setSelectedRecord(record);
        setIsEditModalOpen(true);
      },
    },
  });

  return (
    <div className="space-y-4">
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