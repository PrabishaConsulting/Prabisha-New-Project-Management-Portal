"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { products } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormModal } from "@/components/modals/product-form-modal";
import { DataTable } from "./data-table";

interface ProductClientProps {
  initialData: products[];
  columns: ColumnDef<products>[];
}

export function ProductClient({ initialData, columns }: ProductClientProps) {
  const [data, setData] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProductCreated = (newProduct: products) => {
    setData((current) => [newProduct, ...current]);
  };

  const handleProductUpdated = (updatedProduct: products) => {
    setData((current) =>
      current.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };
  
  const handleProductDeleted = (deletedProductIds: string | string[]) => {
    const idsToDelete = new Set(Array.isArray(deletedProductIds) ? deletedProductIds : [deletedProductIds]);
    setData((current) => current.filter((p) => !idsToDelete.has(p.id)));
  };

  return (
    <>
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleProductCreated}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Our Products ({data.length})</CardTitle>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            searchKey="title"
            onProductUpdated={handleProductUpdated}
            onProductDeleted={handleProductDeleted}
          />
        </CardContent>
      </Card>
    </>
  );
}