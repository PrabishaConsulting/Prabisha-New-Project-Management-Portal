// app/our-product/_components/client.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  pageCount: number;
  onDataChange: () => void;
}

export function ProductClient({ initialData, columns, pageCount, onDataChange }: ProductClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // This handler is called after a create, update, or delete action is successful
  const handleSuccess = () => {
    onDataChange(); // Calls the server action to revalidate and refetch
  };

  return (
    <>
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
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