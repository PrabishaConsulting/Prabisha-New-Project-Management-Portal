// app/our-product/_components/client.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { products } from "@/app/generated/client";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormModal } from "@/components/modals/product-form-modal";
import { DataTable } from "./data-table";

interface ProductClientProps {
  initialData: any;
  columns: ColumnDef<products>[];
  pageCount: number;
  categories : any;
}

export function ProductClient({ initialData, columns, pageCount , categories}: ProductClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    router.refresh(); // Optional: force a client-side refresh
  };

  return (
    <>
      {/* Your table/data display here */}
      
      

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={handleSuccess} // Pass the function here
        initialData={editingProduct}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Our Products</CardTitle>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
          categories={categories}
            columns={columns}
            data={initialData}
            searchKey="title"
            pageCount={pageCount}
            onSuccess={handleSuccess} // Pass handler for edit/delete actions
          />
        </CardContent>
      </Card>
    </>
  );
}
