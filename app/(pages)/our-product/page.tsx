import { db } from "@/lib/db";
import { ProductClient } from "./_components/client";
import { columns } from "./_components/columns";

export default async function ProductsPage() {
  const products = await db.products.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="container mx-auto py-10">
      <ProductClient initialData={products} columns={columns} />
    </div>
  );
}