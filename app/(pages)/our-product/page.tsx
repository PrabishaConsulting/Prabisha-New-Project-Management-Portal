// app/our-product/page.tsx

import { db } from "@/lib/db";
import { ProductClient } from "./_components/client";
import { columns } from "./_components/columns";
import { getAllCategories } from "@/actions/categories";
// Explicitly mark this page as dynamic
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

interface OurProductPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string; // Add category parameter
  }>;
}

export default async function OurProductPage({
  searchParams,
}: OurProductPageProps) {
  const searchServer = await searchParams;

  // Get page and category from searchParams
  const page = Number(searchServer.page) || 1;
  const category = searchServer.category || ""; // Get category filter

  // Build where clause for filtering
  const whereClause = category ? {
    categories: {
      some: {
        id: category
      }
    }
  } : {};

  const [products, totalProducts] = await Promise.all([
    db.products.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        categories: true // Include categories in the response
      },
      where: whereClause // Apply category filter
    }),
    db.products.count({
      where: whereClause // Apply same filter to count
    }),
  ]);

  const pageCount = Math.ceil(totalProducts / PAGE_SIZE);
  const categories = await getAllCategories()
  
  return (
    <div className="p-4 md:p-6">
      <ProductClient
      categories={categories}
        initialData={products}
        columns={columns}
        pageCount={pageCount}
      />
    </div>
  );
}