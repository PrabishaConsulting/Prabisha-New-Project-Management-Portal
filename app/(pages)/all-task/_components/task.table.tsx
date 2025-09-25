"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFacetedRowModel,
  getFacetedUniqueValues,
} from "@tanstack/react-table";
import { useState } from "react";
import { TaskData, taskColumns } from "./task.coloumn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TaskStatus, Priority } from "@prisma/client";
import { Download, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TaskTableProps {
  data: TaskData[];
}

export default function TaskTable({ data }: TaskTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns: taskColumns as ColumnDef<TaskData, any>[],
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const handleExportToExcel = () => {
    const dataToExport = table.getFilteredRowModel().rows.map((row) => ({
      "Task ID": `PTI${String(row.index + 1).padStart(4, "0")}`,
      Title: row.original.title,
      Status: row.original.status,
      Priority: row.original.priority,
      Assignee: row.original.assignee?.name ?? "Unassigned",
      Project: row.original.project?.name ?? "-",
      "Start Date": new Date(row.original.createdAt).toLocaleDateString(),
      "Due Date": row.original.dueDate
        ? new Date(row.original.dueDate).toLocaleDateString()
        : "N/A",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, "Tasks.xlsx");
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF();
    const tableData = table
      .getFilteredRowModel()
      .rows.map((row) => [
        `PTI${String(row.index + 1).padStart(4, "0")}`,
        row.original.title,
        row.original.status,
        row.original.priority,
        row.original.assignee?.name ?? "Unassigned",
        row.original.project?.name ?? "-",
        new Date(row.original.createdAt).toLocaleDateString(),
        row.original.dueDate
          ? new Date(row.original.dueDate).toLocaleDateString()
          : "N/A",
      ]);

    // FIX #2: Call autoTable as an imported function, passing the doc instance
    autoTable(doc, {
      head: [
        [
          "Task ID",
          "Title",
          "Status",
          "Priority",
          "Assignee",
          "Project",
          "Start Date",
          "Due Date",
        ],
      ],
      body: tableData,
    });

    doc.save("Tasks.pdf");
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Input
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(value) => {
              // FIX: Check for the special 'all' value to clear the filter
              const isClearValue = value === "all";
              table
                .getColumn("status")
                ?.setFilterValue(isClearValue ? undefined : [value]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className=" capitalize">
              {/* FIX: Use a non-empty string like "all" */}
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(TaskStatus).map((status) => {
                // First, convert "TO_DO" to "to do"
                const formattedText = status.replace(/_/g, " ").toLowerCase();

                return (
                  <SelectItem key={status} value={status}>
                    {/* Then, capitalize the first letter: "To do" */}
                    {formattedText.charAt(0).toUpperCase() +
                      formattedText.slice(1)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => {
              // FIX: Apply the same logic here for the priority filter
              const isClearValue = value === "all";
              table
                .getColumn("priority")
                ?.setFilterValue(isClearValue ? undefined : [value]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Priority" />
            </SelectTrigger>
            <SelectContent>
              {/* FIX: Use "all" here as well to avoid the error */}
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.values(Priority).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportToExcel} variant="outline">
            <FileDown className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button onClick={handleExportToPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table className=" w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={taskColumns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
