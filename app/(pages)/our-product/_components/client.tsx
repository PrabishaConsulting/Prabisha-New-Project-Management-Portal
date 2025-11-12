// app/our-product/_components/client.tsx

"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { products } from "@/app/generated/client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormModal } from "@/components/modals/product-form-modal";
import { DataTable } from "./data-table";

interface ProductClientProps {
  initialData: any;
  initialPageCount: number;
  initialTotalProducts: number;
  initialCategories: any;
  columns: ColumnDef<products>[];
}

export function ProductClient({ 
  initialData, 
  initialPageCount, 
  initialTotalProducts, 
  initialCategories, 
  columns 
}: ProductClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const handleSuccess = useCallback(() => {
    setIsModalOpen(false);
    setEditingProduct(null);
    // We'll let the DataTable handle the refresh
    window.location.reload();
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingProduct(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingProduct(null);
  }, []);

  return (
    <>
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        initialData={editingProduct}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Our Products</CardTitle>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            initialData={initialData}
            initialPageCount={initialPageCount}
            initialTotalProducts={initialTotalProducts}
            initialCategories={initialCategories}
            columns={columns}
            searchKey="title"
          />
        </CardContent>
      </Card>
    </>
  );
}