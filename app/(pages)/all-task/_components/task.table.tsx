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
import { useState, useMemo, useRef } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TaskStatus, Priority } from "@/app/generated/client";
import { Download, FileDown, Calendar as CalendarIcon, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, isWithinInterval, endOfDay, endOfWeek, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { type DateRange } from "react-day-picker";

// Date Range Picker Component
const DateRangePicker = ({ 
  onApply, 
  onCancel 
}: { 
  onApply: (range: DateRange) => void;
  onCancel: () => void;
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const handleApply = () => {
    if (dateRange?.from) {
      onApply(dateRange);
    }
  };

  return (
    <div className="w-auto p-0">
      <Calendar
        mode="range"
        defaultMonth={dateRange?.from}
        selected={dateRange}
        onSelect={setDateRange}
        numberOfMonths={2}
        className="rounded-lg border shadow-sm"
      />
      <div className="flex justify-end space-x-2 p-3 border-t">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="px-3 py-1 h-8 text-sm"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleApply}
          disabled={!dateRange?.from}
          className="px-3 py-1 h-8 text-sm"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

interface TaskTableProps {
  data: TaskData[];
  showDateFilter?: boolean;
}

export default function TaskTable({ data, showDateFilter = false }: TaskTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: new  Date(),
    end: null
  });
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const popoverRef = useRef<HTMLButtonElement>(null);

  // Filter data based on date selection
  const filteredData = useMemo(() => {
    if (dateFilter === "all") return data;

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (dateFilter) {

      case "custom":
        if (!customDateRange.start || !customDateRange.end) return data;
        startDate = customDateRange.start;
        endDate = customDateRange.end;
        break;
      default:
        return data;
    }

    return data.filter(task => {
      const taskDate = new Date(task.createdAt);
      return isWithinInterval(taskDate, { start: startDate, end: endDate });
    });
  }, [data, dateFilter, customDateRange]);

  const table = useReactTable({
    data: filteredData,
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

  const handleCustomDateApply = (range: DateRange) => {
    setCustomDateRange({ 
      start: range.from || null, 
      end: range.to || null 
    });
    setDateFilter("custom");
    setShowCustomDateRange(false);
  };

  const handleCustomDateCancel = () => {
    setShowCustomDateRange(false);
  };

  const handleCustomRangeSelect = () => {
    setDateFilter("custom");
    setShowCustomDateRange(true);
    // Focus the popover trigger to ensure it stays open
    setTimeout(() => {
      if (popoverRef.current) {
        popoverRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <Input
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />
          
          {/* Conditionally render date filter based on prop */}
          {showDateFilter && (
           
              

              <Popover open={showCustomDateRange} onOpenChange={setShowCustomDateRange}>
                <PopoverTrigger asChild>
                  <Button 
                    
                    variant="outline" 
                    className={cn(
                      "w-[260px] justify-start text-left font-normal",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange.start ? (
                      customDateRange.end ? (
                        <>
                          {format(customDateRange.start, "LLL dd, y")} -{" "}
                          {format(customDateRange.end, "LLL dd, y")}
                        </>
                      ) : (
                        format(customDateRange.start, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DateRangePicker 
                    onApply={handleCustomDateApply}
                    onCancel={handleCustomDateCancel}
                  />
                </PopoverContent>
              </Popover>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            onValueChange={(value) => {
              const isClearValue = value === "all";
              table
                .getColumn("status")
                ?.setFilterValue(isClearValue ? undefined : [value]);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="capitalize">
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(TaskStatus).map((status) => {
                const formattedText = status.replace(/_/g, " ").toLowerCase();
                return (
                  <SelectItem key={status} value={status}>
                    {formattedText.charAt(0).toUpperCase() + formattedText.slice(1)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => {
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
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.values(Priority).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button onClick={handleExportToExcel} variant="outline">
              <FileDown className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button onClick={handleExportToPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters Display - only show if date filter is enabled */}
      {showDateFilter && (
        <div className="flex flex-wrap gap-2">
          {dateFilter !== "all" && (
            <div className="flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
              <Filter className="h-3 w-3 mr-1" />
              {dateFilter === "custom" && customDateRange.start && customDateRange.end ? (
                <span>
                  {format(customDateRange.start, "MMM d")} - {" "}
                  {format(customDateRange.end, "MMM d, yyyy")}
                </span>
              ) : (
                <span>
                  {dateFilter === "today" && "Today"}
                  {dateFilter === "yesterday" && "Yesterday"}
                  {dateFilter === "currentWeek" && "Current Week"}
                  {dateFilter === "currentMonth" && "Current Month"}
                </span>
              )}
              <button
                onClick={() => {
                  setDateFilter("all");
                  setCustomDateRange({ start: null, end: null });
                }}
                className="ml-2 text-blue-900 hover:text-blue-700"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table className="w-full">
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