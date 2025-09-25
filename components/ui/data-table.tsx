// components/ui/data-table.tsx
"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowUpDown, 
  Download, 
  Search, 
  FileText, 
  FileSpreadsheet,
  Filter,
  MoreHorizontal,
  Edit,
  Trash
} from "lucide-react";

// Define types for our component props
export interface TableColumn {
  accessorKey: string;
  header: string;
  cell?: (item: any) => React.ReactNode;
  enableSorting?: boolean;
  enableFiltering?: boolean;
}

export interface DataTableProps {
  data: any[];
  columns: TableColumn[];
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableExportPDF?: boolean;
  enableExportExcel?: boolean;
  enableActions?: boolean;
  updateDialog?: React.ComponentType<{ 
    item: any; 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    onSave: (item: any) => void;
  }>;
  deleteDialog?: React.ComponentType<{ 
    item: any; 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    onConfirm: (item: any) => void;
  }>;
  onUpdate?: (item: any) => void;
  onDelete?: (item: any) => void;
  title?: string;
  description?: string;
}

export function DataTable({
  data,
  columns,
  enableSorting = true,
  enableFiltering = true,
  enableExportPDF = true,
  enableExportExcel = true,
  enableActions = true,
  updateDialog: UpdateDialog,
  deleteDialog: DeleteDialog,
  onUpdate,
  onDelete,
  title,
  description,
}: DataTableProps) {
  const [sorting, setSorting] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [filtering, setFiltering] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  // Handle sorting
  const handleSort = (column: string) => {
    if (!enableSorting) return;
    
    if (sorting && sorting.column === column) {
      setSorting({
        column,
        direction: sorting.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSorting({ column, direction: 'asc' });
    }
  };

  // Handle filtering
  const filteredData = useMemo(() => {
    if (!filtering) return data;
    
    return data.filter((item) => {
      return columns.some((column) => {
        const value = item[column.accessorKey];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(filtering.toLowerCase());
      });
    });
  }, [data, filtering, columns]);

  // Handle sorting
  const sortedData = useMemo(() => {
    if (!sorting) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sorting.column];
      const bValue = b[sorting.column];
      
      if (aValue === null || aValue === undefined) return sorting.direction === 'asc' ? -1 : 1;
      if (bValue === null || bValue === undefined) return sorting.direction === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sorting.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sorting.direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
  }, [filteredData, sorting]);

  // Handle pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Export to Excel
  const exportToExcel = () => {
    if (!enableExportExcel) return;
    
    // In a real implementation, you would use a library like xlsx
    alert('Exporting to Excel...');
    console.log('Excel export data:', sortedData);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!enableExportPDF) return;
    
    // In a real implementation, you would use a library like jspdf
    alert('Exporting to PDF...');
    console.log('PDF export data:', sortedData);
  };

  // Handle update
  const handleUpdate = (item: any) => {
    setSelectedItem(item);
    setUpdateDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (item: any) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  // Confirm update
  const confirmUpdate = (updatedItem: any) => {
    if (onUpdate) {
      onUpdate(updatedItem);
    }
    setUpdateDialogOpen(false);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (onDelete && selectedItem) {
      onDelete(selectedItem);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || description) && (
        <div>
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {enableFiltering && (
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter..."
              value={filtering}
              onChange={(e) => setFiltering(e.target.value)}
              className="pl-8 w-full sm:w-[250px]"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {enableExportExcel && (
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          )}
          {enableExportPDF && (
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.accessorKey}>
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {enableSorting && column.enableSorting !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(column.accessorKey)}
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
              {enableActions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (enableActions ? 1 : 0)} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={column.accessorKey}>
                      {column.cell ? column.cell(item) : item[column.accessorKey]}
                    </TableCell>
                  ))}
                  {enableActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {UpdateDialog && (
                            <DropdownMenuItem onClick={() => handleUpdate(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {DeleteDialog && (
                            <DropdownMenuItem onClick={() => handleDelete(item)}>
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page = i;
                if (totalPages > 5) {
                  if (currentPage <= 3) {
                    page = i;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page + 1}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Update Dialog */}
      {UpdateDialog && selectedItem && (
        <UpdateDialog
          item={selectedItem}
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          onSave={confirmUpdate}
        />
      )}

      {/* Delete Dialog */}
      {DeleteDialog && selectedItem && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the item.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}