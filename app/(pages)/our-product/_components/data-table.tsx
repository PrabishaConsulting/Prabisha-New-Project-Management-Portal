// app/our-product/_components/data-table.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  initialData: TData[];
  initialPageCount: number;
  initialTotalProducts: number;
  initialCategories: any;
  searchKey: string;
}

export function DataTable<TData, TValue>({
  columns,
  initialData,
  initialPageCount,
  initialTotalProducts,
  initialCategories,
  searchKey,
}: DataTableProps<TData, TValue>) {
  // State for data and pagination
  const [data, setData] = useState<TData[]>(initialData);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [totalProducts, setTotalProducts] = useState(initialTotalProducts);
  const [categories] = useState(initialCategories);
  const [isLoading, setIsLoading] = useState(false);

  // State for filters and pagination
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Page size options
  const pageSizeOptions = [10, 20, 50, 100];

  // Function to fetch data from API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    // Build query parameters
    const params = new URLSearchParams();
    params.set("page", (pagination.pageIndex + 1).toString());
    params.set("limit", pagination.pageSize.toString());
    
    if (columnFilters.length > 0 && columnFilters[0].value) {
      params.set("search", columnFilters[0].value as string);
    }
    
    // Add category filter if needed
    const categoryFilter = columnFilters.find(filter => filter.id === "category");
    if (categoryFilter && categoryFilter.value) {
      params.set("category", categoryFilter.value as string);
    }
    
    if (sorting.length > 0) {
      params.set("sortBy", sorting[0].id);
      params.set("sortOrder", sorting[0].desc ? "desc" : "asc");
    }
    
    try {
      const response = await fetch(`/api/products?${params.toString()}`);
      const result = await response.json();
      
      if (response.ok) {
        setData(result.data);
        setPageCount(result.pageCount);
        setTotalProducts(result.totalProducts);
      } else {
        console.error("Failed to fetch data:", result.error);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination, columnFilters, sorting]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle search submission
  const handleSearchSubmit = useCallback(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page
  }, []);

  // Handle Enter key press in search input
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  }, [handleSearchSubmit]);

  // Handle category change
  const handleCategoryChange = useCallback((value: string) => {
    setColumnFilters(prev => {
      // Remove existing category filter if any
      const filtered = prev.filter(filter => filter.id !== "category");
      
      // Add new category filter if not "all"
      if (value && value !== "all") {
        return [...filtered, { id: "category", value }];
      }
      
      return filtered;
    });
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((value: string) => {
    const newPageSize = Number(value);
    setPagination(prev => ({ 
      ...prev, 
      pageIndex: 0, // Reset to first page
      pageSize: newPageSize 
    }));
  }, []);

  // Memoize the table instance to prevent unnecessary re-renders
  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: { sorting, columnFilters, pagination },
  });

  return (
    <div>
      <div className="flex items-center py-4 space-x-4">
        <div className="relative max-w-sm">
          <Input
            placeholder={`Search by ${searchKey}...`}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) => {
              table.getColumn(searchKey)?.setFilterValue(event.target.value);
            }}
            onKeyPress={handleKeyPress}
            className="pr-10"
          />
          <Button
            size="sm"
            className="absolute right-0 top-0 h-full rounded-l-none"
            onClick={handleSearchSubmit}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Rows per page</span>
          <Select value={pagination.pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pagination.pageSize.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of {totalProducts} row(s) selected.
          </div>
          <div className="text-sm font-medium">
            Page {pagination.pageIndex + 1} of {pageCount}
          </div>
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}