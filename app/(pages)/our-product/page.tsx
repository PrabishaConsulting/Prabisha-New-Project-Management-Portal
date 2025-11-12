// app/our-product/page.tsx

import { ProductClient } from "./_components/client";
import { columns } from "./_components/columns";

// Explicitly mark this page as dynamic
export const dynamic = "force-dynamic";

export default async function OurProductPage() {
  // Initial fetch to get the first page of data
  const initialResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/products?page=1&limit=10`, {
    cache: "no-store"
  });
  
  const initialData = await initialResponse.json();
  
  return (
    <div className="p-4 md:p-6">
      <ProductClient
        initialData={initialData.data}
        initialPageCount={initialData.pageCount}
        initialTotalProducts={initialData.totalProducts}
        initialCategories={initialData.categories}
        columns={columns}
      />
    </div>
  );
}